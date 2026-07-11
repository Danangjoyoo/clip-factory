from dataclasses import dataclass

from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.source_preprocessor import ObjectReference
from clip_factory.ports.paid_call import PaidCallInput


@dataclass(frozen=True)
class AnalysisChildInput:
    workflow_id: str
    project_id: str
    transcript: ObjectReference
    remaining_budget_microusd: int = 0
    worst_case_calls: tuple[int, ...] = (0,)
    paid_call: PaidCallInput | None = None

    @classmethod
    def from_project(
        cls, payload: WorkflowInput, transcript: ObjectReference
    ) -> "AnalysisChildInput":
        return cls(payload.workflow_id, payload.project_id, transcript)


@dataclass(frozen=True)
class AnalysisChildResult:
    candidates: tuple[str, ...] = ()
