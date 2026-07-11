from dataclasses import dataclass
from typing import Any
from clip_factory.ports.recovery_state import RecoveryState


@dataclass
class ReconcileJob:
    state: RecoveryState

    async def execute(
        self, project_id: str, events: list[dict[str, Any]], worker_online: bool = True
    ) -> None:
        if not worker_online:
            await self.state.mark_offline(project_id)
        await self.state.rebuild(project_id, events)
