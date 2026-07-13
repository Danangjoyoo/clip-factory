import pytest

from clip_factory.adapters.openai.model_access_adapter import OpenAIModelAccessAdapter
from clip_factory.ports.model_access import ModelAccessStatus


class ApiError(Exception):
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class Models:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.requests: list[str] = []

    async def retrieve(self, model_id: str) -> object:
        self.requests.append(model_id)
        if self.error:
            raise self.error
        return object()


class Client:
    def __init__(self, error: Exception | None = None) -> None:
        self.models = Models(error)


@pytest.mark.anyio
async def test_model_access_rejects_unknown_model_without_network() -> None:
    client = Client()

    result = await OpenAIModelAccessAdapter(client).check("gpt-unknown")

    assert result.status is ModelAccessStatus.NOT_FOUND
    assert client.models.requests == []


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("error", "status"),
    [
        (ApiError(404), ModelAccessStatus.NOT_FOUND),
        (ApiError(403), ModelAccessStatus.NOT_ENTITLED),
        (RuntimeError("boom"), ModelAccessStatus.CHECK_UNAVAILABLE),
    ],
)
async def test_model_access_maps_provider_failures(
    error: Exception, status: ModelAccessStatus
) -> None:
    result = await OpenAIModelAccessAdapter(Client(error)).check("gpt-5.5")

    assert result.status is status
    assert result.reasoning
    assert result.max_generated_tokens > 0


@pytest.mark.anyio
async def test_model_access_reports_available_catalog_model() -> None:
    result = await OpenAIModelAccessAdapter(Client()).check("gpt-5.6-sol")

    assert result.status is ModelAccessStatus.AVAILABLE
    assert "max" in result.reasoning
