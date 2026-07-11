from enum import StrEnum


class JobState(StrEnum):
    DRAFT = "DRAFT"
    VALIDATING_SOURCE = "VALIDATING_SOURCE"
    UPLOADING = "UPLOADING"
    QUEUED = "QUEUED"
    PREPROCESSING = "PREPROCESSING"
    TRANSCRIBING = "TRANSCRIBING"
    VERIFYING_BUDGET = "VERIFYING_BUDGET"
    AWAITING_BUDGET = "AWAITING_BUDGET"
    ANALYZING = "ANALYZING"
    GENERATING_PREVIEWS = "GENERATING_PREVIEWS"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    RENDERING = "RENDERING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    SOURCE_MISSING = "SOURCE_MISSING"
    SOURCE_CHANGED = "SOURCE_CHANGED"
    SOURCE_NOT_ALLOWED = "SOURCE_NOT_ALLOWED"
    RELINKING_SOURCE = "RELINKING_SOURCE"
    PAID_CALL_UNCERTAIN = "PAID_CALL_UNCERTAIN"


_TRANSITIONS = {
    (JobState.QUEUED, "validate"): JobState.VALIDATING_SOURCE,
    (JobState.VALIDATING_SOURCE, "preprocess"): JobState.PREPROCESSING,
    (JobState.PREPROCESSING, "transcribe"): JobState.TRANSCRIBING,
    (JobState.TRANSCRIBING, "analyze"): JobState.ANALYZING,
    (JobState.TRANSCRIBING, "review"): JobState.AWAITING_REVIEW,
    (JobState.ANALYZING, "preview"): JobState.GENERATING_PREVIEWS,
    (JobState.GENERATING_PREVIEWS, "review"): JobState.AWAITING_REVIEW,
    (JobState.AWAITING_REVIEW, "render"): JobState.RENDERING,
    (JobState.RENDERING, "review"): JobState.AWAITING_REVIEW,
    (JobState.AWAITING_REVIEW, "complete"): JobState.COMPLETED,
    (JobState.QUEUED, "cancel"): JobState.CANCELLED,
    (JobState.AWAITING_REVIEW, "cancel"): JobState.CANCELLED,
}


def transition(current: JobState, event: str) -> JobState:
    try:
        return _TRANSITIONS[(current, event)]
    except KeyError as exc:
        raise ValueError(f"invalid transition: {current.value} + {event}") from exc
