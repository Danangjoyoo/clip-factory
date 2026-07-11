from __future__ import annotations

from pathlib import Path
from typing import Protocol

from clip_factory.domain.render_spec import RenderSpec


class RenderEngine(Protocol):
    async def render(
        self, spec: RenderSpec, source: Path, captions: Path, destination: Path
    ) -> dict[str, str]: ...
