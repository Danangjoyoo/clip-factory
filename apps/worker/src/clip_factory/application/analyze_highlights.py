from collections.abc import Iterable

from clip_factory.domain.highlight import (
    HighlightCandidate,
    HighlightValidationError,
    TimeRange,
    intersection_over_union,
    validate_candidate,
)
from clip_factory.ports.highlight_model import HighlightModelPort, HighlightRequest


def rank_candidates(
    candidates: Iterable[HighlightCandidate],
    window: TimeRange | None,
    maximum_clips: int,
    maximum_duration_ms: int,
) -> tuple[HighlightCandidate, ...]:
    if maximum_clips < 0:
        raise ValueError("maximum clips must be nonnegative")
    valid: list[HighlightCandidate] = []
    ranks: dict[int, int] = {}
    items = tuple(candidates)
    for item in items:
        if item.rank:
            ranks[item.rank] = ranks.get(item.rank, 0) + 1
    for candidate in sorted(
        items, key=lambda item: (-item.overall_score, item.start_ms)
    ):
        if candidate.rank and ranks.get(candidate.rank, 0) > 1:
            continue
        try:
            if window is not None:
                validate_candidate(candidate, window, maximum_duration_ms)
            else:
                validate_candidate(
                    candidate,
                    TimeRange(candidate.start_ms, candidate.end_ms),
                    maximum_duration_ms,
                )
        except HighlightValidationError:
            continue
        if any(
            intersection_over_union(
                TimeRange(candidate.start_ms, candidate.end_ms),
                TimeRange(existing.start_ms, existing.end_ms),
            )
            > 0.8
            for existing in valid
        ):
            continue
        valid.append(candidate)
    return tuple(
        HighlightCandidate(
            item.start_ms,
            item.end_ms,
            item.title,
            item.rationale,
            item.overall_score,
            item.scores,
            index,
        )
        for index, item in enumerate(valid[:maximum_clips], 1)
    )


async def analyze_highlights(
    model: HighlightModelPort,
    requests: Iterable[HighlightRequest],
    maximum_clips: int,
    maximum_duration_ms: int,
) -> tuple[HighlightCandidate, ...]:
    all_candidates: list[tuple[HighlightCandidate, TimeRange]] = []
    for request in requests:
        response = await model.extract(request)
        window = (
            request.window
            if isinstance(request.window, TimeRange)
            else TimeRange(0, max(1, len(request.text) * 1000))
        )
        for item in rank_candidates(
            response.candidates, window, maximum_clips, maximum_duration_ms
        ):
            all_candidates.append((item, window))
    valid: list[HighlightCandidate] = []
    for candidate, window in sorted(
        all_candidates, key=lambda pair: (-pair[0].overall_score, pair[0].start_ms)
    ):
        try:
            validate_candidate(candidate, window, maximum_duration_ms)
        except HighlightValidationError:
            continue
        if any(
            intersection_over_union(
                TimeRange(candidate.start_ms, candidate.end_ms),
                TimeRange(existing.start_ms, existing.end_ms),
            )
            > 0.8
            for existing in valid
        ):
            continue
        valid.append(candidate)
    return tuple(
        HighlightCandidate(
            item.start_ms,
            item.end_ms,
            item.title,
            item.rationale,
            item.overall_score,
            item.scores,
            index,
        )
        for index, item in enumerate(valid[:maximum_clips], 1)
    )
