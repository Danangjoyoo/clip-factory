import pytest

from clip_factory.application.analyze_highlights import rank_candidates
from clip_factory.domain.highlight import HighlightCandidate, HighlightScores, TimeRange, HighlightValidationError


def candidate(**overrides):
    values = dict(start_ms=0, end_ms=20_000, title="t", rationale="r", overall_score=1, scores=HighlightScores(1, 1, 1, 1, 1, 1, 1), rank=1)
    values.update(overrides)
    return HighlightCandidate(**values)


def test_malformed_candidate_is_rejected_instead_of_silently_dropped():
    with pytest.raises(HighlightValidationError):
        rank_candidates((candidate(end_ms=0),), TimeRange(0, 30_000), 2, 60_000)


def test_duplicate_rank_is_rejected():
    with pytest.raises(HighlightValidationError):
        rank_candidates((candidate(), candidate(start_ms=30_000, end_ms=50_000)), TimeRange(0, 60_000), 2, 60_000)
