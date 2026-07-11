from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec


@dataclass(frozen=True)
class PreviewMedia:
    path: Path
    probe: MediaProbe | None = None
    duration_ms: int = 0


class PreviewRendererPort(Protocol):
    async def render(
        self, spec: RenderSpec, destination: Path, width: int = 360, height: int = 640
    ) -> PreviewMedia: ...

    async def thumbnail(
        self, preview: Path, destination: Path, time_ms: int = 0
    ) -> Path: ...
