from __future__ import annotations

from dataclasses import dataclass

from clip_factory.application.render_clip import RenderClip, RenderCommand


@dataclass(frozen=True)
class RenderActivity:
    service: RenderClip

    async def __call__(self, command: RenderCommand):
        return await self.service.execute(command)
