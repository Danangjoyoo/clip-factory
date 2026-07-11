from dataclasses import dataclass

from clip_factory.ports.project_results import RenderBatchInput


@dataclass(frozen=True)
class RenderBatchChildInput:
    batch_id: str
    clip_ids: tuple[str, ...]

    @classmethod
    def from_command(cls, command: RenderBatchInput) -> "RenderBatchChildInput":
        return cls(command.batch_id, command.clip_ids)


@dataclass(frozen=True)
class RenderBatchChildResult:
    clip_ids: tuple[str, ...] = ()
