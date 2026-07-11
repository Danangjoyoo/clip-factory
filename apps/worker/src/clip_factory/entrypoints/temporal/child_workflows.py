from datetime import timedelta
from temporalio import activity, workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError

from clip_factory.application.execute_analysis_child import ExecuteAnalysisChild
from clip_factory.domain.cost import verify_remaining_budget
from clip_factory.ports.analysis_child import AnalysisChildInput, AnalysisChildResult
from clip_factory.ports.analysis_child_executor import (
    AnalysisChildExecutorPort,
    BudgetAction,
    BudgetActionResult,
    PersistBudgetActionInput,
)
from clip_factory.ports.render_batch import (
    RenderBatchChildInput,
    RenderBatchChildResult,
)
from clip_factory.ports.highlight_model import HighlightResponse
from clip_factory.ports.paid_call import (
    OPENAI_PRE_SEND_FAILURE,
    PaidCallInput,
)
from clip_factory.entrypoints.temporal.activities.highlight_activities import (
    call_openai_once_activity,
    reconcile_paid_call_activity,
)

PAID_ACTIVITY_OPTIONS = {
    "start_to_close_timeout": timedelta(minutes=30),
    "heartbeat_timeout": timedelta(seconds=30),
    "retry_policy": RetryPolicy(maximum_attempts=1),
}


class _EmptyAnalysisExecutor:
    async def execute(self, _input: AnalysisChildInput) -> AnalysisChildResult:
        return AnalysisChildResult()


_analysis_executor: AnalysisChildExecutorPort = _EmptyAnalysisExecutor()


def configure_analysis_child_executor(executor: AnalysisChildExecutorPort) -> None:
    global _analysis_executor
    _analysis_executor = executor


@activity.defn
async def verify_analysis_budget(input: tuple[int, tuple[int, ...]]) -> bool:
    remaining, costs = input
    return verify_remaining_budget(remaining, costs).allowed


@activity.defn
async def persist_budget_action(input: PersistBudgetActionInput) -> BudgetActionResult:
    action = input.action
    accepted = (
        action.kind == "CANCEL"
        or (
            action.kind == "RAISE_CAP"
            and action.new_cap_microusd is not None
            and action.new_cap_microusd >= 0
        )
        or (
            action.kind == "CHOOSE_COVERAGE"
            and action.start_ms is not None
            and action.end_ms is not None
            and 0 <= action.start_ms < action.end_ms
        )
    )
    return BudgetActionResult(accepted)


@activity.defn
async def execute_analysis_child(input: AnalysisChildInput) -> AnalysisChildResult:
    return await ExecuteAnalysisChild(_analysis_executor).execute(input)


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
        input = _input
        remaining = input.remaining_budget_microusd
        while True:
            self._state = "AWAITING_BUDGET"
            self._budget_action = None
            await workflow.wait_condition(lambda: self._budget_action is not None)
            action = self._budget_action
            if action is None:
                continue
            persisted = await workflow.execute_activity(
                persist_budget_action,
                PersistBudgetActionInput(input.workflow_id, action),
                start_to_close_timeout=timedelta(seconds=30),
            )
            if not persisted.accepted:
                continue
            if action.kind == "CANCEL":
                self._state = "CANCELLED"
                return AnalysisChildResult()
            if action.kind == "RAISE_CAP" and action.new_cap_microusd is not None:
                remaining = action.new_cap_microusd
            if not await workflow.execute_activity(
                verify_analysis_budget,
                (remaining, input.worst_case_calls),
                start_to_close_timeout=timedelta(seconds=30),
            ):
                continue
            self._state = "ANALYZING"
            result = await workflow.execute_activity(
                execute_analysis_child,
                input,
                start_to_close_timeout=timedelta(hours=6),
            )
            self._state = "COMPLETED"
            return result


@workflow.defn
class RenderBatchChildWorkflow:
    @workflow.run
    async def run(self, input: RenderBatchChildInput) -> RenderBatchChildResult:
        return RenderBatchChildResult(input.clip_ids)


@workflow.defn
class PaidCallWorkflow:
    def __init__(self) -> None:
        self._state = "QUEUED"
        self._acknowledged = False

    @workflow.query
    def state(self) -> str:
        return self._state

    @workflow.signal
    def retry_uncertain_paid_call(self, acknowledge_possible_prior_spend: bool) -> None:
        if acknowledge_possible_prior_spend:
            self._acknowledged = True

    @workflow.run
    async def run(self, input: PaidCallInput) -> HighlightResponse:
        self._state = "SENT"
        try:
            result = await workflow.execute_activity(
                call_openai_once_activity,
                input,
                start_to_close_timeout=timedelta(minutes=30),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=1),
            )
            self._state = "COMPLETED"
            return result
        except ActivityError as error:
            cause = error.cause
            if getattr(cause, "type", None) == OPENAI_PRE_SEND_FAILURE:
                self._state = "PRE_SEND_FAILURE"
                raise
            self._state = "PAID_CALL_UNCERTAIN"
            await workflow.wait_condition(lambda: self._acknowledged)
            reconciled = await workflow.execute_activity(
                reconcile_paid_call_activity,
                input,
                start_to_close_timeout=timedelta(minutes=2),
            )
            if reconciled is not None:
                self._state = "COMPLETED"
                return reconciled
            fresh = PaidCallInput(
                input.project_id,
                input.analysis_run_id,
                input.request,
                f"{input.call_id}-retry",
                input.worst_case_microusd,
            )
            result = await workflow.execute_activity(
                call_openai_once_activity,
                fresh,
                start_to_close_timeout=timedelta(minutes=30),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=1),
            )
            self._state = "COMPLETED"
            return result
