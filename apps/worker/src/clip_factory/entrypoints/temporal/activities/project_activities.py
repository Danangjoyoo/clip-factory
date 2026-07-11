from temporalio import activity
from uuid import UUID

from clip_factory.domain.media import MediaProbe
from clip_factory.ports.project_results import (
    EditorInput,
    PrepareManualClipCommand,
    PreprocessSourceInput,
    TranscribeInput,
    ValidateSourceInput,
)
from clip_factory.ports.source_preprocessor import ObjectReference, PreparedSource


@activity.defn
async def validate_source(input: ValidateSourceInput) -> str:
    return input.source_asset_id


@activity.defn
async def preprocess_source(input: PreprocessSourceInput) -> PreparedSource:
    return PreparedSource(
        source_asset_id=UUID(input.source_asset_id),
        probe=MediaProbe(0, 0, "mp4", "h264", 0, 0, 0, 1, None, None),
        audio_object=ObjectReference(
            "clip-factory", f"projects/{input.project_id}/audio/source", "", ""
        ),
    )


@activity.defn
async def transcribe(input: TranscribeInput) -> ObjectReference:
    return input.audio_object


@activity.defn
async def prepare_editor(input: EditorInput) -> ObjectReference:
    return input.transcript


@activity.defn
async def prepare_manual_clip(input: PrepareManualClipCommand) -> str:
    return input.clip_id


@activity.defn
async def extract_audio(input: PreprocessSourceInput) -> PreparedSource:
    return await preprocess_source(input)
