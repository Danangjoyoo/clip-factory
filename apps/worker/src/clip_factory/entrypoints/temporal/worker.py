import os
from typing import Any

from temporalio.client import Client
from temporalio.worker import Worker

from clip_factory.composition.worker_container import project_activities
from clip_factory.composition.paid_call import LocalPaidCallDependencies
from clip_factory.adapters.openai.fake_highlight_adapter import FakeHighlightAdapter
from clip_factory.adapters.openai.highlight_adapter import OpenAIHighlightAdapter
from clip_factory.entrypoints.temporal.activities.highlight_activities import (
    configure_paid_highlight_call,
)
from clip_factory.entrypoints.temporal.child_workflows import (
    AnalysisChildWorkflow,
    RenderBatchChildWorkflow,
    PaidCallWorkflow,
)
from clip_factory.entrypoints.temporal.project_workflow import ProjectWorkflow


def build_worker(client: Client, task_queue: str = "clip-factory") -> Worker:
    dependencies = LocalPaidCallDependencies(
        os.environ.get("CLIP_FACTORY_PAID_STATE", ".clip-factory-paid-calls.sqlite3")
    )
    if os.environ.get("OPENAI_API_KEY"):
        from openai import AsyncOpenAI

        model: Any = OpenAIHighlightAdapter(
            AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        )
    else:
        model = FakeHighlightAdapter()
    configure_paid_highlight_call(model, dependencies)
    return Worker(
        client,
        task_queue=task_queue,
        workflows=[
            ProjectWorkflow,
            AnalysisChildWorkflow,
            RenderBatchChildWorkflow,
            PaidCallWorkflow,
        ],
        activities=project_activities(),
        max_concurrent_activities=1,
        max_concurrent_workflow_tasks=20,
    )
