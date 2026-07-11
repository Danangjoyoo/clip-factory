from collections.abc import Awaitable, Callable
from typing import Any

from clip_factory.application.build_crop_track import BuildCropTrack


def make_reframe_activity(builder: BuildCropTrack) -> Callable[[str, object], Awaitable[Any]]:
    async def build(source: str, probe: object) -> Any:
        return await builder.execute(source, probe)

    return build
