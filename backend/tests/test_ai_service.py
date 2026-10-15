import pytest

from app.config import settings
from app.services import ai_insights


class FakeResponse:
    def __init__(self, status_code: int, body: dict) -> None:
        self.status_code = status_code
        self._body = body

    def json(self) -> dict:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise ai_insights.httpx.HTTPStatusError(
                "error", request=None, response=None
            )


class InvalidJsonResponse(FakeResponse):
    def json(self) -> dict:
        raise ValueError("invalid json")


class FakeClient:
    responses: list[FakeResponse] = []

    def __init__(self, *args, **kwargs) -> None:
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args) -> None:
        return None

    async def post(self, *args, **kwargs) -> FakeResponse:
        return self.responses.pop(0)


class TimeoutClient(FakeClient):
    async def post(self, *args, **kwargs) -> FakeResponse:
        raise ai_insights.httpx.ReadTimeout("timeout")


class ResultModel(ai_insights.BaseModel):
    answer: str


@pytest.mark.asyncio
async def test_openrouter_json_output_is_validated(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 0)
    FakeClient.responses = [
        FakeResponse(
            200,
            {"choices": [{"message": {"content": "```json\n{\"answer\":\"ok\"}\n```"}}]},
        )
    ]
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", FakeClient)
    result = await ai_insights.generate_json("test", ResultModel)
    assert result.answer == "ok"


@pytest.mark.asyncio
async def test_openrouter_retries_rate_limits(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 1)
    FakeClient.responses = [
        FakeResponse(429, {"error": "limited"}),
        FakeResponse(200, {"choices": [{"message": {"content": '{"answer":"ok"}'}}]}),
    ]
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", FakeClient)
    result = await ai_insights.generate_json("test", ResultModel)
    assert result.answer == "ok"


@pytest.mark.asyncio
async def test_openrouter_rejects_malformed_output(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 0)
    FakeClient.responses = [
        FakeResponse(200, {"choices": [{"message": {"content": "not-json"}}]})
    ]
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", FakeClient)
    with pytest.raises(ai_insights.AIProviderError, match="malformed"):
        await ai_insights.generate_json("test", ResultModel)


@pytest.mark.asyncio
async def test_openrouter_authentication_failure_is_not_retried(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 2)
    FakeClient.responses = [FakeResponse(401, {"error": "unauthorized"})]
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", FakeClient)
    with pytest.raises(ai_insights.AIProviderError, match="authentication"):
        await ai_insights.generate_json("test", ResultModel)


@pytest.mark.asyncio
async def test_openrouter_rejects_invalid_response_envelope(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 0)
    FakeClient.responses = [InvalidJsonResponse(200, {})]
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", FakeClient)
    with pytest.raises(ai_insights.AIProviderError, match="response envelope"):
        await ai_insights.generate_json("test", ResultModel)


@pytest.mark.asyncio
async def test_openrouter_timeout_is_bounded(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    monkeypatch.setattr(settings, "openrouter_max_retries", 1)
    monkeypatch.setattr(ai_insights.httpx, "AsyncClient", TimeoutClient)
    with pytest.raises(ai_insights.AIProviderError, match="timed out"):
        await ai_insights.generate_json("test", ResultModel)
