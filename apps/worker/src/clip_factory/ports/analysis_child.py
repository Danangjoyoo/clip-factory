from dataclasses import dataclass
from uuid import uuid4

from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.source_preprocessor import ObjectReference
from clip_factory.ports.paid_call import PaidCallInput
from clip_factory.ports.highlight_model import HighlightRequest


@dataclass(frozen=True)
class AnalysisChildInput:
    workflow_id: str
    project_id: str
    transcript: ObjectReference
    remaining_budget_microusd: int = 0
    worst_case_calls: tuple[int, ...] = (0,)
    paid_call: PaidCallInput | None = None
    transcript_text: str = ""

    @classmethod
    def from_project(
        cls, payload: WorkflowInput, transcript: ObjectReference,
        transcript_text: str = "",
    ) -> "AnalysisChildInput":
        if payload.mode != "AI_HIGHLIGHTS":
            return cls(payload.workflow_id, payload.project_id, transcript)
        end_ms = payload.coverage_end_ms or payload.max_clip_seconds * 1000
        if end_ms <= payload.coverage_start_ms:
            raise ValueError("analysis coverage window is invalid")
        request = HighlightRequest(
            text=transcript_text,
            model=payload.model_id,
            reasoning=payload.reasoning,
            instruction=payload.instruction,
            maximum_clips=payload.maximum_clips,
            maximum_duration_ms=payload.max_clip_seconds * 1000,
            window=(payload.coverage_start_ms, end_ms),
        )
        call = PaidCallInput(
            payload.project_id,
            payload.workflow_id,
            request,
            str(uuid4()),
            payload.budget_microusd,
        )
        return cls(
            payload.workflow_id,
            payload.project_id,
            transcript,
            payload.budget_microusd,
            # The budget is already the user-approved reservation ceiling; the
            # child gate must not apply the 1.5x estimator a second time.
            (0,),
            call,
            transcript_text,
        )


@dataclass(frozen=True)
class AnalysisChildResult:
    candidates: tuple[str, ...] = ()
