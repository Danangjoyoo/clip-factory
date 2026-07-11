from typing import Any

from clip_factory.ports.model_access import (
    ModelAccessPort,
    ModelAccessResult,
    ModelAccessStatus,
)

MODEL_CATALOG = {
    "gpt-5.6-sol": {
        "none": 4096,
        "low": 16384,
        "medium": 24576,
        "high": 32768,
        "xhigh": 49152,
        "max": 65536,
    },
    "gpt-5.5": {
        "none": 4096,
        "low": 16384,
        "medium": 24576,
        "high": 32768,
        "xhigh": 49152,
    },
}


class OpenAIModelAccessAdapter(ModelAccessPort):
    def __init__(self, client: Any) -> None:
        self._client = client

    async def check(self, model_id: str) -> ModelAccessResult:
        profile = MODEL_CATALOG.get(model_id)
        if profile is None:
            return ModelAccessResult(
                model_id,
                ModelAccessStatus.NOT_FOUND,
                "Model is not in the approved catalog",
            )
        try:
            await self._client.models.retrieve(model_id)
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if status == 404:
                return ModelAccessResult(
                    model_id,
                    ModelAccessStatus.NOT_FOUND,
                    "Model was not found",
                    tuple(profile),
                    max(profile.values()),
                )
            if status in (401, 403):
                return ModelAccessResult(
                    model_id,
                    ModelAccessStatus.NOT_ENTITLED,
                    "Model is not available for this key",
                    tuple(profile),
                    max(profile.values()),
                )
            return ModelAccessResult(
                model_id,
                ModelAccessStatus.CHECK_UNAVAILABLE,
                "Model availability could not be checked",
                tuple(profile),
                max(profile.values()),
            )
        return ModelAccessResult(
            model_id,
            ModelAccessStatus.AVAILABLE,
            "Available",
            tuple(profile),
            max(profile.values()),
        )
