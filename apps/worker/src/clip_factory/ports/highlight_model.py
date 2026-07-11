from dataclasses import dataclass
from typing import Protocol

from clip_factory.domain.highlight import HighlightCandidate


@dataclass(frozen=True)
class HighlightRequest:
    text: str
    model: str
    reasoning: str
    instruction: str = ""
    maximum_clips: int = 10
    maximum_duration_ms: int = 180_000
    window: object | None = None


@dataclass(frozen=True)
class HighlightResponse:
    candidates: tuple[HighlightCandidate, ...]
    response_id: str | None = None
    usage: dict[str, int] | None = None


class HighlightModelPort(Protocol):
    async def extract(self, request: HighlightRequest) -> HighlightResponse: ...
