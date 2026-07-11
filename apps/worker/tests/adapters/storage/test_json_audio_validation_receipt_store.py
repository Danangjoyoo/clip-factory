from pathlib import Path

from clip_factory.adapters.storage.json_audio_validation_receipt_store import (
    JsonAudioValidationReceiptStore,
)
from clip_factory.ports.source_preprocessor import (
    AudioValidationReceipt,
    ObjectReference,
)


def test_receipt_store_replays_after_reopen(tmp_path: Path) -> None:
    path = tmp_path / "receipts.json"
    receipt = AudioValidationReceipt(
        "asset",
        "fingerprint",
        "normalization-v1",
        ObjectReference("bucket", "key", "v1", "sha"),
    )
    JsonAudioValidationReceiptStore(path).put(receipt)
    assert JsonAudioValidationReceiptStore(path).get("key") == receipt
