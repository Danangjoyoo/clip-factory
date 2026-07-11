import asyncio
import hashlib
import sys
import types
from pathlib import Path

from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)
from clip_factory.adapters.transcription.mlx_whisper_adapter import MlxWhisperAdapter
from clip_factory.ports.source_preprocessor import ObjectReference


class Cache:
    def __init__(self, root: Path) -> None:
        self.root = root

    def require_verified(self) -> Path:
        path = self.root / "model"
        path.mkdir()
        return path


class Store:
    def download(self, _reference: ObjectReference, destination: Path) -> str:
        destination.write_bytes(b"a")
        return "v1"


def reference() -> ObjectReference:
    return ObjectReference("bucket", "audio", "v1", hashlib.sha256(b"a").hexdigest())


def test_mlx_adapter_passes_language_and_local_model(
    monkeypatch, tmp_path: Path
) -> None:
    calls = []
    module = types.SimpleNamespace(
        transcribe=lambda *args, **kwargs: (
            calls.append((args, kwargs))
            or {
                "text": "hola",
                "segments": [
                    {
                        "text": "hola",
                        "start": 0,
                        "end": 1,
                        "words": [
                            {"word": "hola", "start": 0, "end": 1, "probability": None}
                        ],
                    }
                ],
            }
        )
    )
    monkeypatch.setitem(sys.modules, "mlx_whisper", module)
    result = asyncio.run(
        MlxWhisperAdapter(
            MinioObjectMaterializer(Store(), tmp_path), Cache(tmp_path)
        ).transcribe(reference(), "es", None)
    )
    args, kwargs = calls[0]
    assert args[0].endswith("source.bin")
    assert kwargs == {
        "path_or_hf_repo": str(tmp_path / "model"),
        "language": "es",
        "word_timestamps": True,
        "task": "transcribe",
    }
    assert result.document.words[0].confidence_micros is None
    assert list(tmp_path.glob("clip-factory-*")) == []
