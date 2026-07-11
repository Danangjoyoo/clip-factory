from temporalio.client import Client
from temporalio.worker import Worker

from clip_factory.composition.worker_container import project_activities
from clip_factory.entrypoints.temporal.child_workflows import (
    AnalysisChildWorkflow,
    RenderBatchChildWorkflow,
)
from clip_factory.entrypoints.temporal.project_workflow import ProjectWorkflow


def build_worker(client: Client, task_queue: str = "clip-factory") -> Worker:
    return Worker(
        client,
        task_queue=task_queue,
        workflows=[ProjectWorkflow, AnalysisChildWorkflow, RenderBatchChildWorkflow],
        activities=project_activities(),
        max_concurrent_activities=1,
        max_concurrent_workflow_tasks=20,
    )
