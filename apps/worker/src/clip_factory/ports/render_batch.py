from dataclasses import dataclass
from typing import Literal, Protocol

from clip_factory.ports.project_results import RenderBatchInput


RenderBatchStatus = Literal["COMPLETED", "FAILED"]


@dataclass(frozen=True)
class RenderBatchChildInput:
    batch_id: str
    clip_ids: tuple[str, ...]

    @classmethod
    def from_command(cls, command: RenderBatchInput) -> "RenderBatchChildInput":
        return cls(command.batch_id, command.clip_ids)


@dataclass(frozen=True)
class RenderBatchResultItem:
    clip_id: str
    status: RenderBatchStatus
    error: str | None = None


@dataclass(frozen=True)
class RenderBatchChildResult:
    outcomes: tuple[RenderBatchResultItem, ...] = ()

    @property
    def completed(self) -> tuple[str, ...]:
        return tuple(item.clip_id for item in self.outcomes if item.status == "COMPLETED")

    @property
    def failed(self) -> tuple[str, ...]:
        return tuple(item.clip_id for item in self.outcomes if item.status == "FAILED")

    @property
    def completed_count(self) -> int:
        return len(self.completed)

    @property
    def failed_count(self) -> int:
        return len(self.failed)


class RenderBatchExecutorPort(Protocol):
    async def execute(self, payload: RenderBatchChildInput) -> RenderBatchChildResult: ...
