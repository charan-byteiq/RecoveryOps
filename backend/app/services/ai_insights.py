"""OpenRouter client and focused prompt templates for Root Cause insights."""

import json
import logging
import re
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings

logger = logging.getLogger("recoveryops")
ModelT = TypeVar("ModelT", bound=BaseModel)


class AIProviderError(RuntimeError):
    pass


def _json_text(content: str) -> str:
    cleaned = content.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL | re.IGNORECASE)
    return fenced.group(1) if fenced else cleaned


async def generate_json(prompt: str, response_model: type[ModelT]) -> ModelT:
    """Call OpenRouter once per attempt and reject all unvalidated model output."""
    if not settings.openrouter_api_key:
        raise AIProviderError("OPENROUTER_API_KEY is not configured")

    url = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": "Return only valid JSON matching the requested schema."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 900,
    }
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_http_referer,
        "X-OpenRouter-Title": settings.openrouter_app_title,
    }

    for attempt in range(settings.openrouter_max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.openrouter_timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
            if response.status_code in {401, 403}:
                raise AIProviderError(f"OpenRouter authentication rejected ({response.status_code})")
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < settings.openrouter_max_retries:
                    logger.warning("OpenRouter retryable response %s on attempt %d", response.status_code, attempt + 1)
                    continue
                raise AIProviderError(f"OpenRouter unavailable ({response.status_code})")
            response.raise_for_status()
            try:
                body = response.json()
            except ValueError as exc:
                raise AIProviderError("OpenRouter returned a malformed response envelope") from exc
            choices = body.get("choices") if isinstance(body, dict) else None
            first_choice = choices[0] if isinstance(choices, list) and choices else {}
            message = first_choice.get("message") if isinstance(first_choice, dict) else {}
            content = message.get("content") if isinstance(message, dict) else None
            if not isinstance(content, str) or not content.strip():
                raise AIProviderError("OpenRouter returned no assistant content")
            try:
                return response_model.model_validate(json.loads(_json_text(content)))
            except (json.JSONDecodeError, ValidationError) as exc:
                raise AIProviderError("OpenRouter returned malformed insight JSON") from exc
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            if attempt < settings.openrouter_max_retries:
                logger.warning("OpenRouter transport retry on attempt %d: %s", attempt + 1, exc)
                continue
            raise AIProviderError("OpenRouter request timed out or failed") from exc
        except httpx.HTTPError as exc:
            raise AIProviderError("OpenRouter HTTP request failed") from exc
    raise AIProviderError("OpenRouter request exhausted retries")


def branch_comparison_prompt(context: dict[str, Any]) -> str:
    return _prompt(
        "Compare the selected branch with its backend-selected reference peer using all five KPIs. Identify material strengths, weaknesses, business significance, and evidence-backed recommendations. Do not recalculate or invent KPI values. Do not claim causation from correlation. Return JSON with narrative, strengths, weaknesses, recommendations, and evidence.",
        context,
    )


def selected_kpi_prompt(context: dict[str, Any]) -> str:
    return _prompt(
        "Explain only the selected KPI for the selected branch. State what it indicates, its contribution to overall performance, the supported performance gap, and one practical recommendation. Populate performance_direction as favorable, unfavorable, neutral, or unavailable. Populate core_variance, frontline_driver, priority_action, and cohort_focus only when the supplied evidence supports them; otherwise use null. Do not invent operational causes. Return JSON with metric_code, narrative, performance_direction, core_variance, frontline_driver, priority_action, cohort_focus, recommendation, and evidence.",
        context,
    )


def overall_branch_prompt(context: dict[str, Any]) -> str:
    return _prompt(
        "Write one concise paragraph about the selected branch's own overall performance across all five KPIs. Identify strongest and weakest KPIs, supported relationships, and the most important priorities. Do not compare it to another branch and do not invent targets, causes, or values. Return JSON with narrative and evidence.",
        context,
    )


def _prompt(instruction: str, context: dict[str, Any]) -> str:
    return f"Purpose: {instruction}\n\nNumerical evidence and context (authoritative; treat missing values as unavailable):\n{json.dumps(context, separators=(',', ':'), sort_keys=True)}"
