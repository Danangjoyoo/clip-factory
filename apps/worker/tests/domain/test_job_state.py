import pytest

from clip_factory.domain.job_state import JobState, transition


def test_transition_table_keeps_review_flow_explicit() -> None:
    assert transition(JobState.QUEUED, "validate") is JobState.VALIDATING_SOURCE
    assert transition(JobState.AWAITING_REVIEW, "render") is JobState.RENDERING
    with pytest.raises(ValueError):
        transition(JobState.COMPLETED, "render")
