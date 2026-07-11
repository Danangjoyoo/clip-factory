from collections.abc import Callable
from typing import Any

from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    prepare_manual_clip,
    transcribe,
    validate_source,
)


def project_activities() -> list[Callable[..., Any]]:
    return [validate_source, extract_audio, transcribe, prepare_editor, prepare_manual_clip]
