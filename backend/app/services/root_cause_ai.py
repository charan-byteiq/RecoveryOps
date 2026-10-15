"""Authoritative Root Cause context assembly and deterministic fallbacks."""

from datetime import UTC, datetime
from typing import Any

from app import schemas
from app.services.ai_insights import (
    AIProviderError,
    branch_comparison_prompt,
    generate_json,
    overall_branch_prompt,
    selected_kpi_prompt,
)

CORE_KPIS = [
    "collection_efficiency",
    "avg_days_to_resolve",
    "ptp_kept_rate",
    "contact_rate",
    "dpd_30_plus_concentration",
]

KPI_ALIASES = {
    "avg_resolution_days": "avg_days_to_resolve",
    "ptp_kept": "ptp_kept_rate",
    "dpd_distribution": "dpd_30_plus_concentration",
}


def normalize_kpi(code: str) -> str:
    normalized = KPI_ALIASES.get(code, code)
    if normalized not in CORE_KPIS:
        raise ValueError(f"Unsupported KPI: {code}")
    return normalized


def _value(metric: Any) -> float | None:
    if metric is None or metric.availability != "available" or metric.value is None:
        return None
    return float(metric.value)


def _metric_context(code: str, branch_metrics: dict[str, Any], benchmark_metrics: dict[str, Any] | None = None) -> dict[str, Any]:
    branch = branch_metrics.get(code)
    benchmark = (benchmark_metrics or {}).get(code)
    branch_value = _value(branch)
    benchmark_value = _value(benchmark)
    unit = branch.unit if branch else (benchmark.unit if benchmark else "unknown")
    direction = "unavailable"
    if branch_value is not None and benchmark_value is not None:
        delta = branch_value - benchmark_value
        favorable = delta < 0 if unit == "days" or code == "dpd_30_plus_concentration" else delta > 0
        direction = "neutral" if delta == 0 else ("favorable" if favorable else "unfavorable")
    return {
        "metric_code": code,
        "branch_value": branch_value,
        "benchmark_value": benchmark_value,
        "delta": branch_value - benchmark_value if branch_value is not None and benchmark_value is not None else None,
        "unit": unit,
        "performance_direction": direction,
    }


def build_context(branch: Any, branch_metrics: dict[str, Any], network_averages: dict[str, float | None], drivers: list[Any], segments: list[Any], dpd: list[Any], reference: dict[str, Any] | None = None) -> dict[str, Any]:
    reference_metrics = (reference or {}).get("metrics", {})
    return {
        "branch": {"id": branch.id, "code": branch.source_branch_code, "name": branch.name, "region": branch.region},
        "reference_branch": (reference or {}).get("identity"),
        "kpis": [_metric_context(code, branch_metrics, reference_metrics) for code in CORE_KPIS],
        "network_averages": {code: network_averages.get(code) for code in CORE_KPIS},
        "contributing_points": [
            {"metric_code": d.metric_code, "value": _value(d), "unit": d.unit, "availability": d.availability, "segments": d.contributing_segments}
            for d in drivers
            if d.metric_code in CORE_KPIS
        ],
        "supporting_segments": [
            {"segment_type": s.segment_type, "segment_value": s.segment_value, "metric_code": s.metric_code, "value": float(s.value) if s.value is not None else None, "account_count": s.account_count}
            for s in segments
            if s.value is not None
        ],
        "dpd_distribution": [
            {"bucket": d.bucket, "account_count": d.account_count, "portfolio_share": float(d.portfolio_share) if d.portfolio_share is not None else None}
            for d in dpd
        ],
    }


def _evidence(context: dict[str, Any], only: str | None = None) -> list[schemas.AIInsightEvidence]:
    rows = context["kpis"] if only is None else [row for row in context["kpis"] if row["metric_code"] == only]
    return [schemas.AIInsightEvidence(metric_code=row["metric_code"], branch_value=row["branch_value"], benchmark_value=row.get("benchmark_value"), delta=row.get("delta"), unit=row["unit"], source="backend") for row in rows]


def _meta(kind: str, status: str, source_version: str) -> schemas.AIInsightMeta:
    return schemas.AIInsightMeta(insight_type=kind, status=status, model_version="z-ai/glm-5.3-flash" if status == "ai" else "deterministic-fallback", generated_at=datetime.now(UTC), source_data_version=source_version)


async def make_comparison(context: dict[str, Any], source_version: str) -> tuple[schemas.BranchComparisonInsight, schemas.AIInsightMeta]:
    try:
        result = await generate_json(branch_comparison_prompt(context), schemas.BranchComparisonInsight)
        return result, _meta("branch_comparison", "ai", source_version)
    except AIProviderError:
        selected = context["branch"]["name"]
        reference = (context.get("reference_branch") or {}).get("name", "the reference peer")
        gaps = [row for row in context["kpis"] if row["performance_direction"] == "unfavorable"]
        strengths = [row["metric_code"] for row in context["kpis"] if row["performance_direction"] == "favorable"]
        narrative = f"{selected} is compared with {reference} across the five core KPIs. The largest supported gaps are {', '.join(row['metric_code'] for row in gaps[:2]) or 'not available'}, while strengths are {', '.join(strengths[:2]) or 'not available'}."
        fallback = schemas.BranchComparisonInsight(narrative=narrative, strengths=strengths[:3], weaknesses=[row["metric_code"] for row in gaps[:3]], recommendations=[f"Review the backend evidence for {row['metric_code']} before prioritizing an operational response." for row in gaps[:2]], evidence=_evidence(context))
        return fallback, _meta("branch_comparison", "fallback", source_version)


async def make_selected_kpi(context: dict[str, Any], kpi: str, source_version: str) -> tuple[schemas.SelectedKpiInsight, schemas.AIInsightMeta]:
    selected_context = {**context, "selected_kpi": kpi}
    selected_row = next(row for row in selected_context["kpis"] if row["metric_code"] == kpi)
    network_benchmark = selected_context["network_averages"].get(kpi)
    selected_row = {**selected_row, "benchmark_value": network_benchmark}
    selected_row["delta"] = (
        selected_row["branch_value"] - network_benchmark
        if selected_row["branch_value"] is not None and network_benchmark is not None
        else None
    )
    if selected_row["delta"] is None:
        selected_row["performance_direction"] = "unavailable"
    elif selected_row["delta"] == 0:
        selected_row["performance_direction"] = "neutral"
    else:
        favorable = selected_row["delta"] < 0 if selected_row["unit"] == "days" or kpi == "dpd_30_plus_concentration" else selected_row["delta"] > 0
        selected_row["performance_direction"] = "favorable" if favorable else "unfavorable"
    selected_context["kpis"] = [selected_row if row["metric_code"] == kpi else row for row in selected_context["kpis"]]
    try:
        result = await generate_json(selected_kpi_prompt(selected_context), schemas.SelectedKpiInsight)
        if result.metric_code != kpi:
            raise AIProviderError("Model returned a different KPI")
        return result, _meta("selected_kpi", "ai", source_version)
    except (AIProviderError, ValueError):
        row = selected_row
        direction = row["performance_direction"]
        driver = next((d for d in selected_context["contributing_points"] if d["metric_code"] == kpi), None)
        segment_text = "; ".join(
            f"{s.get('segment_type', s.get('segmentType', 'segment'))}="
            f"{s.get('segment_value', s.get('segmentValue', 'unknown'))} ({s.get('impact', 'available')})"
            for s in (driver or {}).get("segments", [])
        ) or None
        fallback = schemas.SelectedKpiInsight(metric_code=kpi, narrative=f"{kpi} for {selected_context['branch']['name']} is {row['branch_value']} versus network benchmark {row['benchmark_value']}, with {direction} performance direction.", performance_direction=direction, core_variance=f"Observed delta: {row['delta']} {row['unit']}.", frontline_driver=f"Available contributing evidence: {segment_text}" if segment_text else None, priority_action=f"Use the available {kpi} evidence to target the largest verified gap; no unsupported cause is inferred.", cohort_focus=segment_text, recommendation=f"Validate and act on the supplied {kpi} evidence before changing frontline operations.", evidence=_evidence(selected_context, kpi))
        return fallback, _meta("selected_kpi", "fallback", source_version)


async def make_overall(context: dict[str, Any], source_version: str) -> tuple[schemas.OverallBranchInsight, schemas.AIInsightMeta]:
    own_context = {
        **context,
        "reference_branch": None,
        "network_averages": {},
        "kpis": [
            {
                **row,
                "benchmark_value": None,
                "delta": None,
                "performance_direction": "unavailable",
            }
            for row in context["kpis"]
        ],
    }
    try:
        result = await generate_json(overall_branch_prompt(own_context), schemas.OverallBranchInsight)
        return result, _meta("overall_branch", "ai", source_version)
    except AIProviderError:
        available = [row for row in own_context["kpis"] if row["branch_value"] is not None]
        narrative = f"{own_context['branch']['name']} has {len(available)} of 5 core KPIs available across collection efficiency, resolution, kept promises, contact, and 30+ DPD concentration. Use the available KPI pattern and contributing evidence to prioritize the weakest verified operating area; recheck unavailable measures before drawing further conclusions." if available else f"{own_context['branch']['name']} does not have sufficient valid KPI data for an overall performance conclusion."
        return schemas.OverallBranchInsight(narrative=narrative, evidence=_evidence(own_context)), _meta("overall_branch", "fallback", source_version)
