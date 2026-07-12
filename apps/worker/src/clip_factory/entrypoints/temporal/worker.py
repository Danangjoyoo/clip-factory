import os
from pathlib import Path
from typing import Any

from temporalio.client import Client
from temporalio.worker import Worker

from clip_factory.composition.worker_container import project_activities
from clip_factory.composition.paid_call import LocalPaidCallDependencies
from clip_factory.adapters.openai.model_access_adapter import OpenAIModelAccessAdapter
from clip_factory.adapters.storage.minio_artifact_store import MinioArtifactStore
from clip_factory.application.check_model_access import CheckModelAccess
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
from clip_factory.ports.model_access import ModelAccessResult


def build_worker(
    client: Client, task_queue: str = "clip-factory", openai_api_key: str | None = None
) -> Worker:
    dependencies = LocalPaidCallDependencies(
        os.environ.get("CLIP_FACTORY_PAID_STATE", ".clip-factory-paid-calls.sqlite3")
    )
    api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
    if api_key:
        from openai import AsyncOpenAI

        sdk_client: Any = AsyncOpenAI(api_key=api_key)
        model: Any = OpenAIHighlightAdapter(sdk_client)
        model_access: Any = OpenAIModelAccessAdapter(sdk_client)
    else:
        model = FakeHighlightAdapter()

        class _FakeModelAccess:
            async def check(self, model_id: str) -> ModelAccessResult:
                from clip_factory.ports.model_access import ModelAccessStatus

                return ModelAccessResult(model_id, ModelAccessStatus.AVAILABLE)

        model_access = _FakeModelAccess()
    configure_paid_highlight_call(model, dependencies, CheckModelAccess(model_access))
    from clip_factory.entrypoints.temporal.activities.project_activities import (
        configure_transcript_loader,
    )

    configure_transcript_loader(
        MinioArtifactStore(
            Path(
                os.environ.get("CLIP_FACTORY_ARTIFACT_ROOT", ".clip-factory-artifacts")
            )
        )
    )
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
