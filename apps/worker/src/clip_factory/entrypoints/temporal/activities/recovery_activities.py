from typing import Any
from clip_factory.application.reconcile_job import ReconcileJob


async def reconcile_project(
    job: ReconcileJob, project_id: str, events: list[dict[str, Any]]
) -> None:
    await job.execute(project_id, events)
