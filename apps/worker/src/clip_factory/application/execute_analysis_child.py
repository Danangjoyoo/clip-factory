from clip_factory.ports.analysis_child import AnalysisChildInput, AnalysisChildResult
from clip_factory.ports.analysis_child_executor import AnalysisChildExecutorPort


class ExecuteAnalysisChild:
    def __init__(self, executor: AnalysisChildExecutorPort) -> None:
        self._executor = executor

    async def execute(self, input: AnalysisChildInput) -> AnalysisChildResult:
        return await self._executor.execute(input)
