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


@dataclass(frozen=True)
class AudioValidationReceipt:
    """Typed proof that a normalized audio object belongs to one source revision."""

    source_asset_id: str
    fingerprint: str
    normalization_version: str
    audio_object: ObjectReference


class AudioValidationReceiptPort(Protocol):
    """Durable receipt store used to make audio extraction restart-safe."""

    def get(self, key: str) -> AudioValidationReceipt | None: ...

    def put(self, receipt: AudioValidationReceipt) -> None: ...


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
