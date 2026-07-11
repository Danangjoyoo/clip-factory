import pytest

from clip_factory.domain.job_state import JobState, transition


def test_transition_table_keeps_review_flow_explicit() -> None:
    assert transition(JobState.QUEUED, "validate") is JobState.VALIDATING_SOURCE
    assert transition(JobState.AWAITING_REVIEW, "render") is JobState.RENDERING
    with pytest.raises(ValueError):
        transition(JobState.COMPLETED, "render")


def test_terminal_states_reject_every_event() -> None:
    for state in (JobState.COMPLETED, JobState.CANCELLED):
        with pytest.raises(ValueError):
            transition(state, "cancel")
        with pytest.raises(ValueError):
            transition(state, "review")


def test_source_relink_and_manual_clip_are_canonical_transitions() -> None:
    assert (
        transition(JobState.VALIDATING_SOURCE, "source_missing")
        is JobState.SOURCE_MISSING
    )
    assert transition(JobState.SOURCE_MISSING, "relink") is JobState.RELINKING_SOURCE
    assert transition(JobState.RELINKING_SOURCE, "preprocess") is JobState.PREPROCESSING
    assert (
        transition(JobState.AWAITING_REVIEW, "manual_clip") is JobState.AWAITING_REVIEW
    )
    with pytest.raises(ValueError):
        transition(JobState.SOURCE_MISSING, "preprocess")
