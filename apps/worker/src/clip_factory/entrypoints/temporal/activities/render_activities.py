from dataclasses import dataclass
from typing import Any
from clip_factory.application.render_clip import RenderClip
@dataclass(frozen=True)
class RenderActivity:
    service: RenderClip
    async def __call__(self, payload: dict[str, Any]) -> Any:
        return await self.service.execute(payload)
