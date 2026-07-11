"""Domain values and validation for highlight candidates."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TimeRange:
    start_ms: int
    end_ms: int

    def __post_init__(self) -> None:
        if self.start_ms < 0 or self.end_ms <= self.start_ms:
            raise ValueError("invalid time range")


@dataclass(frozen=True)
class TranscriptWindow:
    time_range: TimeRange
    text: str

    @property
    def start_ms(self) -> int:
        return self.time_range.start_ms

    @property
    def end_ms(self) -> int:
        return self.time_range.end_ms


@dataclass(frozen=True)
class HighlightScores:
    hook: int
    coherence: int
    payoff: int
    novelty: int
    energy: int
    instruction_fit: int
    boundary_quality: int

    def values(self) -> tuple[int, ...]:
        return (
            self.hook,
            self.coherence,
            self.payoff,
            self.novelty,
            self.energy,
            self.instruction_fit,
            self.boundary_quality,
        )


@dataclass(frozen=True)
class HighlightCandidate:
    start_ms: int
    end_ms: int
    title: str
    rationale: str
    overall_score: int
    scores: HighlightScores
    rank: int = 0


class HighlightValidationError(ValueError):
    pass


def intersection_over_union(left: TimeRange, right: TimeRange) -> float:
    intersection = max(
        0, min(left.end_ms, right.end_ms) - max(left.start_ms, right.start_ms)
    )
    union = max(left.end_ms, right.end_ms) - min(left.start_ms, right.start_ms)
    return intersection / union if union else 0.0


def validate_candidate(
    candidate: HighlightCandidate, window: TimeRange, maximum_duration_ms: int
) -> None:
    if candidate.start_ms < window.start_ms or candidate.end_ms > window.end_ms:
        raise HighlightValidationError("candidate outside window")
    if (
        candidate.end_ms <= candidate.start_ms
        or candidate.end_ms - candidate.start_ms > maximum_duration_ms
    ):
        raise HighlightValidationError("invalid candidate duration")
    if not candidate.title.strip() or not candidate.rationale.strip():
        raise HighlightValidationError("candidate text is required")
    if not 0 <= candidate.overall_score <= 1_000_000 or any(
        not 0 <= value <= 1_000_000 for value in candidate.scores.values()
    ):
        raise HighlightValidationError("score outside range")
