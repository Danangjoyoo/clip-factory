import asyncio

from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.application.execute_render_batch import RenderBatchExecutor
from clip_factory.entrypoints.temporal import child_workflows
from clip_factory.ports.render_batch import RenderBatchChildInput


def test_render_batch_workflow_collects_independent_child_results() -> None:
    asyncio.run(_run())


async def _run() -> None:
    previous = child_workflows._render_batch_executor
    child_workflows.configure_render_batch_executor(
        RenderBatchExecutor(child_workflows.RenderWorkflow.run)
    )
    try:
        async with await WorkflowEnvironment.start_time_skipping() as env:
            async with Worker(
                env.client,
                task_queue="render-batch-test",
                workflows=[child_workflows.RenderBatchChildWorkflow, child_workflows.RenderWorkflow],
            ):
                handle = await env.client.start_workflow(
                    child_workflows.RenderBatchChildWorkflow.run,
                    RenderBatchChildInput(
                        "batch-1", ("clip-good-1", "clip-fail", "clip-good-2")
                    ),
                    id="render-batch-1",
                    task_queue="render-batch-test",
                )
                result = await handle.result()
                assert result.completed == ("clip-good-1", "clip-good-2")
                assert result.failed == ("clip-fail",)
                assert len(result.outcomes) == 3
                assert result.completed_count == 2
                assert result.failed_count == 1
                assert result.outcomes[1].error == "RENDER_FAILED"
    finally:
        child_workflows.configure_render_batch_executor(previous)
