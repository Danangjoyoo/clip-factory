from dataclasses import dataclass
from typing import Protocol

from clip_factory.ports.analysis_child import AnalysisChildInput, AnalysisChildResult


class AnalysisChildExecutorPort(Protocol):
    async def execute(self, input: AnalysisChildInput) -> AnalysisChildResult: ...


@dataclass(frozen=True)
class BudgetAction:
    kind: str
    new_cap_microusd: int | None = None
    start_ms: int | None = None
    end_ms: int | None = None


@dataclass(frozen=True)
class PersistBudgetActionInput:
    analysis_run_id: str
    action: BudgetAction


@dataclass(frozen=True)
class BudgetActionResult:
    accepted: bool
