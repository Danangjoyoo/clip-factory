from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Protocol

from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec


Progress = Callable[[int], Awaitable[None] | None]


class PreviewRendererPort(Protocol):
    async def render(
        self,
        spec: RenderSpec,
        destination: Path,
        width: int = 360,
        height: int = 640,
        progress: Progress | None = None,
    ) -> MediaProbe: ...

    async def thumbnail(
        self, preview: Path, destination: Path, time_ms: int = 0
    ) -> None: ...
