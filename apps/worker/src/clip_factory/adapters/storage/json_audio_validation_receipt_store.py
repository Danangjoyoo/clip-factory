"""Small durable receipt store for worker retries."""

import json
import os
from pathlib import Path

from clip_factory.ports.source_preprocessor import (
    AudioValidationReceipt,
    AudioValidationReceiptPort,
    ObjectReference,
)


class JsonAudioValidationReceiptStore(AudioValidationReceiptPort):
    def __init__(self, path: Path) -> None:
        self._path = path

    def get(self, key: str) -> AudioValidationReceipt | None:
        try:
            values = json.loads(self._path.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            return None
        value = values.get(key)
        if not isinstance(value, dict):
            return None
        try:
            reference = value["audio_object"]
            return AudioValidationReceipt(
                str(value["source_asset_id"]),
                str(value["fingerprint"]),
                str(value["normalization_version"]),
                ObjectReference(
                    str(reference["bucket"]),
                    str(reference["key"]),
                    str(reference["version_id"]),
                    str(reference["sha256"]),
                ),
            )
        except (KeyError, TypeError):
            return None

    def put(self, receipt: AudioValidationReceipt) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        try:
            values = json.loads(self._path.read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            values = {}
        values[receipt.audio_object.key] = {
            "source_asset_id": receipt.source_asset_id,
            "fingerprint": receipt.fingerprint,
            "normalization_version": receipt.normalization_version,
            "audio_object": {
                "bucket": receipt.audio_object.bucket,
                "key": receipt.audio_object.key,
                "version_id": receipt.audio_object.version_id,
                "sha256": receipt.audio_object.sha256,
            },
        }
        temporary = self._path.with_suffix(self._path.suffix + ".tmp")
        temporary.write_text(json.dumps(values, sort_keys=True))
        os.replace(temporary, self._path)
