from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from clip_factory.domain.media import MediaProbe


@dataclass(frozen=True)
class ObjectReference:
    bucket: str
    key: str
    version_id: str
    sha256: str


ProgressCallback = Callable[[int, int], Awaitable[None] | None]


@dataclass(frozen=True)
class PreparedSource:
    source_asset_id: UUID
    probe: MediaProbe
    audio_object: ObjectReference


class SourcePreprocessorPort(Protocol):
    async def prepare(
        self, source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback
    ) -> PreparedSource: ...
