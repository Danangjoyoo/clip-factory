import asyncio
from datetime import timedelta

from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    transcribe,
    validate_source,
)
from clip_factory.entrypoints.temporal.project_workflow import ProjectWorkflow
from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.project_results import EditorInput, PreprocessSourceInput, TranscribeInput, ValidateSourceInput


def test_manual_workflow_reaches_review_without_analysis() -> None:
    asyncio.run(_test_manual_workflow_reaches_review_without_analysis())


async def _test_manual_workflow_reaches_review_without_analysis() -> None:
    calls: list[str] = []

    @activity.defn(name="validate_source")
    async def validate(payload: ValidateSourceInput):
        calls.append("validate_source")
        return await validate_source(payload)

    @activity.defn(name="extract_audio")
    async def extract(payload: PreprocessSourceInput):
        calls.append("extract_audio")
        return await extract_audio(payload)

    @activity.defn(name="transcribe")
    async def speech(payload: TranscribeInput):
        calls.append("transcribe")
        return await transcribe(payload)

    @activity.defn(name="prepare_editor")
    async def editor(payload: EditorInput):
        calls.append("prepare_editor")
        return await prepare_editor(payload)

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="phase1-test",
            workflows=[ProjectWorkflow],
            activities=[validate, extract, speech, editor],
            max_concurrent_activities=1,
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="workflow-001",
                task_queue="phase1-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW"
            assert calls == ["validate_source", "extract_audio", "transcribe", "prepare_editor"]
            await handle.signal(ProjectWorkflow.complete_project)
            assert (await handle.result()).status == "COMPLETED"
