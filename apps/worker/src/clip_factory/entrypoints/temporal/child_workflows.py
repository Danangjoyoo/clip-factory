from temporalio import workflow

from clip_factory.ports.analysis_child import AnalysisChildInput, AnalysisChildResult
from clip_factory.ports.render_batch import RenderBatchChildInput, RenderBatchChildResult


@workflow.defn
class AnalysisChildWorkflow:
    @workflow.run
    async def run(self, _input: AnalysisChildInput) -> AnalysisChildResult:
        return AnalysisChildResult()


@workflow.defn
class RenderBatchChildWorkflow:
    @workflow.run
    async def run(self, input: RenderBatchChildInput) -> RenderBatchChildResult:
        return RenderBatchChildResult(input.clip_ids)
