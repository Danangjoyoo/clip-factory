from temporalio import workflow

from clip_factory.ports.analysis_child import AnalysisChildInput, AnalysisChildResult
from clip_factory.ports.analysis_child_executor import BudgetAction
from clip_factory.ports.render_batch import (
    RenderBatchChildInput,
    RenderBatchChildResult,
)


@workflow.defn
class AnalysisChildWorkflow:
    def __init__(self) -> None:
        self._state = "QUEUED"
        self._budget_action: BudgetAction | None = None

    @workflow.query
    def state(self) -> str:
        return self._state

    @workflow.signal
    def raise_budget(self, new_cap_microusd: int) -> None:
        self._budget_action = BudgetAction(
            "RAISE_CAP", new_cap_microusd=new_cap_microusd
        )

    @workflow.signal
    def choose_coverage(self, start_ms: int, end_ms: int) -> None:
        self._budget_action = BudgetAction(
            "CHOOSE_COVERAGE", start_ms=start_ms, end_ms=end_ms
        )

    @workflow.signal
    def cancel_analysis(self) -> None:
        self._budget_action = BudgetAction("CANCEL")

    @workflow.run
    async def run(self, _input: AnalysisChildInput) -> AnalysisChildResult:
        self._state = "AWAITING_BUDGET"
        await workflow.wait_condition(lambda: self._budget_action is not None)
        action = self._budget_action
        if action is not None and action.kind == "CANCEL":
            self._state = "CANCELLED"
            return AnalysisChildResult()
        self._state = "COMPLETED"
        return AnalysisChildResult()


@workflow.defn
class RenderBatchChildWorkflow:
    @workflow.run
    async def run(self, input: RenderBatchChildInput) -> RenderBatchChildResult:
        return RenderBatchChildResult(input.clip_ids)
