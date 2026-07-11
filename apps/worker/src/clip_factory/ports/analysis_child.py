from dataclasses import dataclass

from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.source_preprocessor import ObjectReference


@dataclass(frozen=True)
class AnalysisChildInput:
    workflow_id: str
    project_id: str
    transcript: ObjectReference

    @classmethod
    def from_project(cls, payload: WorkflowInput, transcript: ObjectReference) -> "AnalysisChildInput":
        return cls(payload.workflow_id, payload.project_id, transcript)


@dataclass(frozen=True)
class AnalysisChildResult:
    candidates: tuple[str, ...] = ()
