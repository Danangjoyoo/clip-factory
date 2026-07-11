import asyncio
from pathlib import Path
from uuid import uuid4
from typing import Any

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import (
    LocalFileLocator,
    SourceValidationUpdate,
)
from clip_factory.adapters.media.source_preprocessor_adapter import (
    SourcePreprocessorAdapter,
)
from clip_factory.ports.source_preprocessor import ObjectReference
from clip_factory.ports.source_preprocessor import AudioValidationReceipt
from clip_factory.domain.media import MediaProbe


class Locator:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.update: SourceValidationUpdate | None = None

    def get(self, _asset: str) -> LocalFileLocator:
        return LocalFileLocator("LOCAL_FILE", str(self.path))

    def apply_locator_validation(
        self, update: SourceValidationUpdate
    ) -> dict[str, object]:
        self.update = update
        return {}


class Probe:
    async def probe(self, _path: Path) -> MediaProbe:
        return MediaProbe(1, 1, "mp4", "h264", 1, 1, 1, 1, "aac", 16_000)


class Ffmpeg:
    calls = 0

    async def extract_speech(
        self, source: Path, destination: Path, _progress: Any
    ) -> None:
        self.calls += 1
        assert destination.parent != source.parent
        destination.write_bytes(b"audio")


class Artifacts:
    def __init__(self) -> None:
        self.puts = 0

    def put(self, path: Path, key: str) -> ObjectReference:
        self.puts += 1
        assert path.name == "speech.wav"
        assert path.exists()
        return ObjectReference("bucket", key, "v1", "digest")

    def head(self, _key: str) -> dict[str, str]:
        return {"version_id": "v1", "sha256": "digest"}


class Receipts:
    def __init__(self) -> None:
        self.values: dict[str, AudioValidationReceipt] = {}

    def get(self, key: str) -> AudioValidationReceipt | None:
        return self.values.get(key)

    def put(self, receipt: AudioValidationReceipt) -> None:
        self.values[receipt.audio_object.key] = receipt


def test_preprocessor_posts_typed_validation_and_keeps_source_read_only(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.mp4"
    source.write_bytes(b"source")
    locator = Locator(source)
    asset = uuid4()
    artifacts = Artifacts()
    receipts = Receipts()
    ffmpeg = Ffmpeg()
    adapter = SourcePreprocessorAdapter(
        locator,
        Probe(),  # type: ignore[arg-type]
        ffmpeg,  # type: ignore[arg-type]
        artifacts,
        LocalSourceFilesystem((tmp_path,)),
        object(),
        receipts,
    )
    project = uuid4()
    asyncio.run(adapter.prepare(asset, project, lambda *_: None))
    assert isinstance(locator.update, SourceValidationUpdate)
    assert locator.update.source_asset_id == str(asset)
    assert source.read_bytes() == b"source"
    assert not (tmp_path / "speech.wav").exists()
    asyncio.run(adapter.prepare(asset, project, lambda *_: None))
    assert artifacts.puts == 1
    assert ffmpeg.calls == 1
