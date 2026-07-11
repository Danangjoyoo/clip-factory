import asyncio
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

from clip_factory.application.preprocess_source import PreprocessSource
from clip_factory.composition.preprocess import ArtifactStore, build_preprocess_activity
from clip_factory.composition.settings import WorkerSettings
from clip_factory.entrypoints.temporal.activities.media_activities import (
    PreprocessSourceInput,
)
from clip_factory.domain.media import MediaProbe
from clip_factory.ports.source_preprocessor import (
    ObjectReference,
    PreparedSource,
    ProgressCallback,
)


class Store:
    def put(self, path: Path, key: str) -> ObjectReference:
        return ObjectReference("bucket", key, "version", "digest")

    def head(self, key: str) -> object:
        return {"key": key}

    def download(self, reference: ObjectReference, destination: Path) -> object:
        return reference.version_id


def test_worker_composition_wires_receipts_and_activity_service(tmp_path: Path) -> None:
    settings = WorkerSettings.from_mapping(
        {
            "INTERNAL_SERVICE_TOKEN": "local-test-token",
            "ALLOWED_SOURCE_ROOTS": str(tmp_path),
            "AUDIO_VALIDATION_RECEIPT_PATH": str(tmp_path / "receipts.json"),
        }
    )
    seen: list[tuple[int, int]] = []
    activity = build_preprocess_activity(
        settings,
        cast(ArtifactStore, Store()),
        lambda completed, total: seen.append((completed, total)),
    )
    assert isinstance(activity.service, PreprocessSource)
    assert activity.service._preprocessor._validation_receipts is not None  # type: ignore[attr-defined]

    async def execute(
        source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback
    ) -> PreparedSource:
        heartbeat(1, 1)
        return PreparedSource(
            source_asset_id,
            MediaProbe(1, 1, "mp4", "h264", 1, 1, 1, 1, "aac", 16_000),
            ObjectReference("bucket", f"projects/{project_id}/audio/a.wav", "v", "d"),
        )

    activity.service.execute = execute  # type: ignore[method-assign]
    result = asyncio.run(activity(PreprocessSourceInput(uuid4(), uuid4())))
    assert result.audio_object.bucket == "bucket"
    assert seen == [(1, 1)]
