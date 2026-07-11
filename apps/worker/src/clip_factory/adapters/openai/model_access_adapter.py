from typing import Any

from clip_factory.ports.model_access import (
    ModelAccessPort,
    ModelAccessResult,
    ModelAccessStatus,
)


class OpenAIModelAccessAdapter(ModelAccessPort):
    def __init__(self, client: Any) -> None:
        self._client = client

    async def check(self, model_id: str) -> ModelAccessResult:
        try:
            await self._client.models.retrieve(model_id)
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if status == 404:
                return ModelAccessResult(
                    model_id, ModelAccessStatus.NOT_FOUND, "Model was not found"
                )
            if status in (401, 403):
                return ModelAccessResult(
                    model_id,
                    ModelAccessStatus.NOT_ENTITLED,
                    "Model is not available for this key",
                )
            return ModelAccessResult(
                model_id,
                ModelAccessStatus.CHECK_UNAVAILABLE,
                "Model availability could not be checked",
            )
        return ModelAccessResult(model_id, ModelAccessStatus.AVAILABLE, "Available")
