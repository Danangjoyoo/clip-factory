import asyncio
from typing import cast
from collections.abc import Awaitable, Callable
from uuid import UUID, uuid4

from clip_factory.domain.media import MediaProbe
from clip_factory.entrypoints.temporal.activities.media_activities import (
    PreprocessSourceInput,
    preprocess_source,
)
from clip_factory.application.preprocess_source import PreprocessSource
from clip_factory.ports.source_preprocessor import ObjectReference, PreparedSource


def test_preprocess_activity_payload_contains_no_paths() -> None:
    asset_id, project_id = uuid4(), uuid4()

    class Service:
        async def execute(
            self,
            source_asset_id: UUID,
            received_project_id: UUID,
            _heartbeat: Callable[[int, int], Awaitable[None] | None],
        ) -> PreparedSource:
            assert source_asset_id == asset_id
            assert received_project_id == project_id
            return PreparedSource(
                asset_id,
                MediaProbe(1000, 10, "mp4", "h264", 1, 1, 30, 1, "aac", 16000),
                ObjectReference("bucket", "projects/p/audio/a.wav", "v1", "digest"),
            )

    result = asyncio.run(
        preprocess_source(
            cast(PreprocessSource, Service()),
            PreprocessSourceInput(asset_id, project_id),
            lambda *_: None,
        )
    )
    assert "/" not in str(result.source_asset_id)
    assert "/Users/" not in repr(result)
    assert result.audio_object.key == "projects/p/audio/a.wav"
