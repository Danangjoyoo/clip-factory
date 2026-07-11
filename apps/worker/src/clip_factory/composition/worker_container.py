from collections.abc import Callable
from typing import Any

from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    prepare_manual_clip,
    transcribe,
    load_transcript_text,
    validate_source,
)
from clip_factory.entrypoints.temporal.child_workflows import (
    execute_analysis_child,
    persist_budget_action,
    verify_analysis_budget,
)
from clip_factory.entrypoints.temporal.activities.highlight_activities import (
    call_openai_once_activity,
    reconcile_paid_call_activity,
    reserve_paid_call_activity,
)


def project_activities() -> list[Callable[..., Any]]:
    return [
        validate_source,
        extract_audio,
        transcribe,
        load_transcript_text,
        prepare_editor,
        prepare_manual_clip,
        verify_analysis_budget,
        persist_budget_action,
        execute_analysis_child,
        call_openai_once_activity,
        reserve_paid_call_activity,
        reconcile_paid_call_activity,
    ]
