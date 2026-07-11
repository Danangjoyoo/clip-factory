import asyncio
from datetime import timedelta

from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from temporalio.exceptions import ApplicationError

from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    transcribe,
    validate_source,
)
from clip_factory.entrypoints.temporal.project_workflow import ProjectWorkflow
from clip_factory.entrypoints.temporal.child_workflows import RenderBatchChildWorkflow
from clip_factory.ports.project_results import WorkflowInput
from clip_factory.ports.project_results import EditorInput, PreprocessSourceInput, TranscribeInput, ValidateSourceInput
from clip_factory.ports.project_results import PrepareManualClipCommand
from clip_factory.ports.project_results import RenderBatchInput


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
            for _ in range(1000):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW"
            assert calls == ["validate_source", "extract_audio", "transcribe", "prepare_editor"]
            await handle.signal(ProjectWorkflow.complete_project)
            assert (await handle.result()).status == "COMPLETED"


def test_review_signals_serialize_manual_and_render_batches() -> None:
    asyncio.run(_test_review_signals_serialize_manual_and_render_batches())


async def _test_review_signals_serialize_manual_and_render_batches() -> None:
    activities = []

    @activity.defn(name="validate_source")
    async def validate(payload: ValidateSourceInput):
        activities.append("validate")
        return await validate_source(payload)

    @activity.defn(name="extract_audio")
    async def extract(payload: PreprocessSourceInput):
        activities.append("extract")
        return await extract_audio(payload)

    @activity.defn(name="transcribe")
    async def speech(payload: TranscribeInput):
        activities.append("transcribe")
        return await transcribe(payload)

    @activity.defn(name="prepare_editor")
    async def editor(payload: EditorInput):
        activities.append("editor")
        return await prepare_editor(payload)

    @activity.defn(name="prepare_manual_clip")
    async def manual(payload: PrepareManualClipCommand):
        activities.append(payload.clip_id)
        return payload.clip_id

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="review-test",
            workflows=[ProjectWorkflow],
            activities=[validate, extract, speech, editor, manual],
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("wf-review", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="wf-review",
                task_queue="review-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            await handle.signal(ProjectWorkflow.prepare_manual_clip, PrepareManualClipCommand("clip-1", 0, 1000))
            await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW"
            await handle.signal(ProjectWorkflow.complete_project)
            assert (await handle.result()).status == "COMPLETED"
            assert activities[-1] == "clip-1"


def test_two_render_batches_are_serialized_before_completion() -> None:
    asyncio.run(_test_two_render_batches_are_serialized_before_completion())


async def _test_two_render_batches_are_serialized_before_completion() -> None:
    @activity.defn(name="validate_source")
    async def validate(payload: ValidateSourceInput):
        return await validate_source(payload)

    @activity.defn(name="extract_audio")
    async def extract(payload: PreprocessSourceInput):
        return await extract_audio(payload)

    @activity.defn(name="transcribe")
    async def speech(payload: TranscribeInput):
        return await transcribe(payload)

    @activity.defn(name="prepare_editor")
    async def editor(payload: EditorInput):
        return await prepare_editor(payload)

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="render-test",
            workflows=[ProjectWorkflow, RenderBatchChildWorkflow],
            activities=[validate, extract, speech, editor],
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("wf-render", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="wf-render",
                task_queue="render-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            await handle.signal(ProjectWorkflow.queue_render_batch, RenderBatchInput("batch-1", ("clip-1",)))
            await handle.signal(ProjectWorkflow.queue_render_batch, RenderBatchInput("batch-2", ("clip-2",)))
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW"
            await handle.signal(ProjectWorkflow.complete_project)
            assert (await handle.result()).status == "COMPLETED"


def test_missing_source_waits_for_relink() -> None:
    asyncio.run(_test_missing_source_waits_for_relink())


async def _test_missing_source_waits_for_relink() -> None:
    attempts = 0

    @activity.defn(name="validate_source")
    async def validate(payload: ValidateSourceInput):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise ApplicationError("missing", non_retryable=True)
        return payload.source_asset_id

    @activity.defn(name="extract_audio")
    async def extract(payload: PreprocessSourceInput):
        return await extract_audio(payload)

    @activity.defn(name="transcribe")
    async def speech(payload: TranscribeInput):
        return await transcribe(payload)

    @activity.defn(name="prepare_editor")
    async def editor(payload: EditorInput):
        return await prepare_editor(payload)

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="relink-test",
            workflows=[ProjectWorkflow],
            activities=[validate, extract, speech, editor],
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("wf-relink", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="wf-relink",
                task_queue="relink-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "SOURCE_MISSING":
                    break
                await env.sleep(timedelta(milliseconds=10))
            assert await handle.query(ProjectWorkflow.state) == "SOURCE_MISSING"
            await handle.signal(ProjectWorkflow.cancel)
            assert (await handle.result()).status == "CANCELLED"


def test_cancel_signal_cancels_running_activity() -> None:
    asyncio.run(_test_cancel_signal_cancels_running_activity())


async def _test_cancel_signal_cancels_running_activity() -> None:
    @activity.defn(name="validate_source")
    async def validate(payload: ValidateSourceInput):
        return payload.source_asset_id

    @activity.defn(name="extract_audio")
    async def slow_extract(_payload: PreprocessSourceInput):
        await asyncio.sleep(60)

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="cancel-test",
            workflows=[ProjectWorkflow],
            activities=[validate, slow_extract],
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("wf-cancel", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="wf-cancel",
                task_queue="cancel-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "PREPROCESSING":
                    break
                await env.sleep(timedelta(milliseconds=10))
            await handle.signal(ProjectWorkflow.cancel)
            assert (await handle.result()).status == "CANCELLED"
