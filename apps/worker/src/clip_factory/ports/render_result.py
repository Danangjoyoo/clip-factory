from __future__ import annotations

from typing import Protocol

from clip_factory.ports.source_preprocessor import ObjectReference


class RenderResultPort(Protocol):
    async def put(self, render_id: str, result: ObjectReference) -> None: ...
