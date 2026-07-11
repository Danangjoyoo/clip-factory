import asyncio
from datetime import timedelta

from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.temporal.child_workflows import (
    AnalysisChildWorkflow,
    configure_analysis_child_executor,
    execute_analysis_child,
    persist_budget_action,
    verify_analysis_budget,
)
from clip_factory.ports.analysis_child import AnalysisChildInput
from clip_factory.ports.analysis_child import AnalysisChildResult
from clip_factory.ports.source_preprocessor import ObjectReference


def test_analysis_child_waits_for_explicit_budget_action() -> None:
    asyncio.run(_run())


async def _run() -> None:
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="budget-test",
            workflows=[AnalysisChildWorkflow],
            activities=[
                persist_budget_action,
                verify_analysis_budget,
                execute_analysis_child,
            ],
        ):
            handle = await env.client.start_workflow(
                AnalysisChildWorkflow.run,
                AnalysisChildInput("w", "p", ObjectReference("s3", "t", "v", "h")),
                id="budget-test",
                task_queue="budget-test",
            )
            await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(AnalysisChildWorkflow.state) == "AWAITING_BUDGET"
            await handle.signal(AnalysisChildWorkflow.cancel_analysis)
            assert (await handle.result()).candidates == ()


def test_analysis_child_rejects_invalid_action_then_executes_after_budget_gate() -> None:
    class FakeExecutor:
        async def execute(self, _input: AnalysisChildInput) -> AnalysisChildResult:
            return AnalysisChildResult(("candidate-1",))

    configure_analysis_child_executor(FakeExecutor())
    asyncio.run(_run_valid_action())


async def _run_valid_action() -> None:
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="budget-valid-test",
            workflows=[AnalysisChildWorkflow],
            activities=[
                persist_budget_action,
                verify_analysis_budget,
                execute_analysis_child,
            ],
        ):
            handle = await env.client.start_workflow(
                AnalysisChildWorkflow.run,
                AnalysisChildInput("w", "p", ObjectReference("s3", "t", "v", "h")),
                id="budget-valid-test",
                task_queue="budget-valid-test",
            )
            await env.sleep(timedelta(milliseconds=10))
            await handle.signal(AnalysisChildWorkflow.choose_coverage, args=[20, 10])
            await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(AnalysisChildWorkflow.state) == "AWAITING_BUDGET"
            await handle.signal(AnalysisChildWorkflow.choose_coverage, args=[0, 10])
            assert (await handle.result()).candidates == ("candidate-1",)
