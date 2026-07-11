from datetime import datetime
from typing import Protocol
from uuid import UUID
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


def _identity(value: str, name: str) -> str:
    try:
        UUID(value)
    except (ValueError, AttributeError, TypeError) as error:
        raise ValueError(f"INVALID_{name.upper()}") from error
    return value


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
        if project_id is not None:
            _identity(project_id, "project_id")
        if workflow_id is not None:
            _identity(workflow_id, "workflow_id")
        if not unit or len(unit) > 50:
            raise ValueError("INVALID_UNIT")
        if stage is not None and (not stage or len(stage) > 100):
            raise ValueError("INVALID_STAGE")
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
            try:
                timestamp = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
            except ValueError as error:
                raise ValueError("INVALID_OCCURRED_AT") from error
            if timestamp.tzinfo is None:
                raise ValueError("INVALID_OCCURRED_AT")
            value["occurredAt"] = timestamp.isoformat()
        heartbeat(value)
