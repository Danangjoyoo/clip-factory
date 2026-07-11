import asyncio
from datetime import timedelta

from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.temporal.child_workflows import AnalysisChildWorkflow
from clip_factory.ports.analysis_child import AnalysisChildInput
from clip_factory.ports.source_preprocessor import ObjectReference


def test_analysis_child_waits_for_explicit_budget_action() -> None:
    asyncio.run(_run())


async def _run() -> None:
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client, task_queue="budget-test", workflows=[AnalysisChildWorkflow]
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
