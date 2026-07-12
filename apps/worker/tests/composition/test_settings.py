from pathlib import Path

import pytest

from clip_factory.composition.settings import WorkerSettings


def test_worker_requires_openai_key_only_when_paid_adapter_is_selected() -> None:
    fake = WorkerSettings.from_mapping(
        {"OPENAI_ADAPTER": "fake", "INTERNAL_SERVICE_TOKEN": "local-test-token"}
    )
    assert fake.openai_api_key is None
    with pytest.raises(
        ValueError, match="OPENAI_API_KEY is required for live OpenAI adapter"
    ):
        WorkerSettings.from_mapping(
            {"OPENAI_ADAPTER": "live", "INTERNAL_SERVICE_TOKEN": "local-test-token"}
        )


def test_worker_composes_durable_audio_receipt_store(tmp_path: Path) -> None:
    settings = WorkerSettings.from_mapping(
        {
            "INTERNAL_SERVICE_TOKEN": "local-test-token",
            "AUDIO_VALIDATION_RECEIPT_PATH": str(tmp_path / "receipts.json"),
        }
    )
    assert (
        settings.audio_validation_receipts().__class__.__name__
        == "JsonAudioValidationReceiptStore"
    )


def test_worker_reads_openai_key_from_local_settings_file(tmp_path: Path) -> None:
    settings_file = tmp_path / "settings.json"
    settings_file.write_text('{"openAiApiKey":"sk-local-settings"}')

    settings = WorkerSettings.from_mapping(
        {
            "OPENAI_ADAPTER": "live",
            "INTERNAL_SERVICE_TOKEN": "local-test-token",
            "SETTINGS_FILE": str(settings_file),
        }
    )

    assert settings.openai_api_key is not None
    assert settings.openai_api_key.get_secret_value() == "sk-local-settings"
