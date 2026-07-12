from collections.abc import Mapping, Sequence
from dataclasses import dataclass
import json
from pathlib import Path
from typing import Literal, cast

from pydantic import SecretStr
from clip_factory.ports.source_preprocessor import AudioValidationReceiptPort


@dataclass(frozen=True)
class WorkerSettings:
    openai_adapter: Literal["fake", "live"]
    openai_api_key: SecretStr | None
    internal_service_token: SecretStr
    internal_api_base_url: str
    temporal_address: str
    redis_url: str
    minio_endpoint: str
    minio_access_key: SecretStr
    minio_secret_key: SecretStr
    allowed_source_roots: Sequence[Path]
    audio_validation_receipt_path: Path

    def audio_validation_receipts(self) -> AudioValidationReceiptPort:
        from clip_factory.adapters.storage.json_audio_validation_receipt_store import (
            JsonAudioValidationReceiptStore,
        )

        return JsonAudioValidationReceiptStore(self.audio_validation_receipt_path)

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "WorkerSettings":
        adapter = values.get("OPENAI_ADAPTER", "fake")
        if adapter not in {"fake", "live"}:
            raise ValueError(f"Unsupported OPENAI_ADAPTER: {adapter}")
        api_key = values.get("OPENAI_API_KEY") or _local_openai_api_key(values)
        if adapter == "live" and not api_key:
            raise ValueError("OPENAI_API_KEY is required for live OpenAI adapter")
        token = values.get("INTERNAL_SERVICE_TOKEN")
        if not token:
            raise ValueError("INTERNAL_SERVICE_TOKEN is required")
        roots = tuple(
            Path(value).expanduser()
            for value in values.get("ALLOWED_SOURCE_ROOTS", "~/Movies").split(":")
        )
        return cls(
            cast(Literal["fake", "live"], adapter),
            SecretStr(api_key) if api_key else None,
            SecretStr(token),
            values.get("INTERNAL_API_BASE_URL", "http://127.0.0.1:3000"),
            values.get("TEMPORAL_ADDRESS", "127.0.0.1:7233"),
            values.get("REDIS_URL", "redis://127.0.0.1:6379/0"),
            values.get("MINIO_ENDPOINT", "http://127.0.0.1:9000"),
            SecretStr(values.get("MINIO_ACCESS_KEY", "clip_factory_local")),
            SecretStr(values.get("MINIO_SECRET_KEY", "clip_factory_local_secret")),
            roots,
            Path(
                values.get(
                    "AUDIO_VALIDATION_RECEIPT_PATH",
                    "./data/audio-validation-receipts.json",
                )
            ).expanduser(),
        )

    @classmethod
    def from_env(cls) -> "WorkerSettings":
        import os

        return cls.from_mapping(os.environ)


def _local_openai_api_key(values: Mapping[str, str]) -> str | None:
    try:
        data = json.loads(
            Path(values.get("SETTINGS_FILE", ".data/settings.json")).read_text()
        )
    except (OSError, json.JSONDecodeError):
        return None
    key = data.get("openAiApiKey")
    return key.strip() if isinstance(key, str) and key.strip() else None
