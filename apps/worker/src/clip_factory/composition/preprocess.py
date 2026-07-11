"""Worker composition root for source preprocessing."""

from collections.abc import Callable
from pathlib import Path
from typing import Protocol
from urllib.request import Request

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client import HttpSourceLocatorClient
from clip_factory.adapters.media.ffmpeg_adapter import FfmpegAdapter
from clip_factory.adapters.media.ffprobe_adapter import FfprobeAdapter
from clip_factory.adapters.media.source_preprocessor_adapter import (
    SourcePreprocessorAdapter,
)
from clip_factory.adapters.process.asyncio_process_runner import AsyncioProcessRunner
from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)
from clip_factory.application.preprocess_source import PreprocessSource
from clip_factory.composition.settings import WorkerSettings
from clip_factory.entrypoints.temporal.activities.media_activities import (
    PreprocessSourceActivity,
)
from clip_factory.ports.source_preprocessor import ObjectReference, ProgressCallback


class ArtifactStore(Protocol):
    def put(self, path: Path, key: str) -> ObjectReference | object: ...

    def head(self, key: str) -> object: ...

    def download(self, reference: ObjectReference, destination: Path) -> object: ...


def build_preprocess_source(
    settings: WorkerSettings,
    artifact_store: ArtifactStore,
    transport: Callable[[Request], bytes] | None = None,
) -> PreprocessSource:
    runner = AsyncioProcessRunner()
    locator = HttpSourceLocatorClient(
        settings.internal_api_base_url,
        settings.internal_service_token.get_secret_value(),
        transport,
    )
    adapter = SourcePreprocessorAdapter(
        locator,
        FfprobeAdapter(runner),
        FfmpegAdapter(runner),
        artifact_store,
        LocalSourceFilesystem(settings.allowed_source_roots),
        MinioObjectMaterializer(artifact_store),
        settings.audio_validation_receipts(),
    )
    return PreprocessSource(adapter)


def build_preprocess_activity(
    settings: WorkerSettings,
    artifact_store: ArtifactStore,
    heartbeat: ProgressCallback,
    transport: Callable[[Request], bytes] | None = None,
) -> PreprocessSourceActivity:
    return PreprocessSourceActivity(
        build_preprocess_source(settings, artifact_store, transport), heartbeat
    )
