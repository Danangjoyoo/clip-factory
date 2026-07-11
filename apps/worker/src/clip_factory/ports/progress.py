from typing import Protocol
from clip_factory.domain.progress import Progress


class ProgressReporter(Protocol):
    def report(
        self,
        completed: int,
        total: int,
        unit: str,
        *,
        project_id: str | None = None,
        workflow_id: str | None = None,
        stage: str | None = None,
        occurred_at: str | None = None,
    ) -> None: ...


class ActivityProgressReporter:
    def __init__(self, activity: object) -> None:
        self._activity = activity

    def report(
        self,
        completed: int,
        total: int,
        unit: str,
        *,
        project_id: str | None = None,
        workflow_id: str | None = None,
        stage: str | None = None,
        occurred_at: str | None = None,
    ) -> None:
        progress = Progress(completed, total, unit)
        heartbeat = getattr(self._activity, "heartbeat")
        value: dict[str, object] = {
            "completedUnits": progress.completed_units,
            "totalUnits": progress.total_units,
            "unit": progress.unit,
        }
        if project_id is not None:
            value["projectId"] = project_id
        if workflow_id is not None:
            value["workflowId"] = workflow_id
        if stage is not None:
            value["stage"] = stage
        if occurred_at is not None:
            value["occurredAt"] = occurred_at
        heartbeat(value)
