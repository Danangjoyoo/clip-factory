from collections.abc import Awaitable, Callable
from typing import Any

from clip_factory.application.generate_preview import GeneratePreview, PreviewCommand


def make_preview_activity(
    service: GeneratePreview,
) -> Callable[[PreviewCommand], Awaitable[Any]]:
    async def generate(command: PreviewCommand) -> Any:
        return await service.execute(command)

    return generate
