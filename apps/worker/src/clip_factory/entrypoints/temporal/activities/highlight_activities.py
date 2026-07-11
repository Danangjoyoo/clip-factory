from typing import Any, Awaitable, Callable

from clip_factory.ports.highlight_model import HighlightRequest


def build_highlight_activity(
    model: Any,
) -> Callable[[HighlightRequest], Awaitable[Any]]:
    async def analyze(request: HighlightRequest) -> Any:
        return await model.extract(request)

    return analyze
