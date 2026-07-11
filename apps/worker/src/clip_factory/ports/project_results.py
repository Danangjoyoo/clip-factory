from dataclasses import dataclass, field
from typing import Literal
from clip_factory.ports.source_preprocessor import ObjectReference


@dataclass(frozen=True)
class WorkflowInput:
    workflow_id: str
    project_id: str
    source_asset_id: str
    mode: Literal["MANUAL", "AI_HIGHLIGHTS"]
    language_tag: str
    max_clip_seconds: int = 60


@dataclass(frozen=True)
class ValidateSourceInput:
    project_id: str
    source_asset_id: str


@dataclass(frozen=True)
class PreprocessSourceInput:
    project_id: str
    source_asset_id: str


@dataclass(frozen=True)
class TranscribeInput:
    project_id: str
    audio_object: ObjectReference
    language_tag: str


@dataclass(frozen=True)
class EditorInput:
    workflow_id: str
    project_id: str
    transcript: ObjectReference
    candidates: tuple[str, ...] = ()


@dataclass(frozen=True)
class PrepareManualClipCommand:
    clip_id: str
    start_ms: int
    end_ms: int


@dataclass(frozen=True)
class RenderBatchInput:
    batch_id: str
    clip_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class ReviewCommand:
    kind: str
    manual_clip: PrepareManualClipCommand | None = None
    render_batch: RenderBatchInput | None = None


@dataclass(frozen=True)
class WorkflowResult:
    workflow_id: str
    project_id: str
    status: Literal["COMPLETED", "CANCELLED", "FAILED"]
    clip_ids: tuple[str, ...] = field(default_factory=tuple)

    @classmethod
    def completed(cls, workflow_id: str, project_id: str) -> "WorkflowResult":
        return cls(workflow_id, project_id, "COMPLETED")


@dataclass(frozen=True)
class PreparedEditor:
    transcript: ObjectReference
