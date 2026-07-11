"""Execute batched renders as independent temporal child-workflows."""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from typing import Awaitable

from temporalio import workflow
from temporalio.exceptions import ApplicationError, CancelledError

from clip_factory.ports.render_batch import (
    RenderBatchChildInput,
    RenderBatchChildResult,
    RenderBatchResultItem,
)
from clip_factory.ports.render_batch_executor import RenderBatchExecutorPort


RenderWorkflow = Callable[[str], Awaitable[object]]


class ExecuteRenderBatch:
    def __init__(self, executor: RenderBatchExecutorPort) -> None:
        self._executor = executor

    async def execute(self, input: RenderBatchChildInput) -> RenderBatchChildResult:
        return await self._executor.execute(input)


class RenderBatchExecutor:
    def __init__(self, render_workflow: RenderWorkflow) -> None:
        self._render_workflow = render_workflow

    async def execute(self, payload: RenderBatchChildInput) -> RenderBatchChildResult:
        outcomes: list[RenderBatchResultItem] = []
        workflow_callable: Callable[[str], object] = self._render_workflow
        for index, clip_id in enumerate(payload.clip_ids):
            try:
                await workflow.execute_child_workflow(
                    workflow_callable,
                    clip_id,
                    id=f"{payload.batch_id}-render-{index}-{clip_id}",
                    execution_timeout=timedelta(hours=1),
                )
                outcomes.append(RenderBatchResultItem(clip_id, "COMPLETED"))
            except CancelledError:
                raise
            except Exception as error:
                outcomes.append(
                    RenderBatchResultItem(
                        clip_id, "FAILED", error=_sanitize_render_error(error)
                    )
                )
        return RenderBatchChildResult(tuple(outcomes))


def _sanitize_render_error(error: BaseException) -> str:
    if isinstance(error, ApplicationError) and isinstance(error.type, str):
        return error.type
    cause = getattr(error, "__cause__", None)
    if cause is not None:
        return _sanitize_render_error(cause)
    return type(error).__name__
