import asyncio
from datetime import timedelta

from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    transcribe,
    validate_source,
)
from clip_factory.entrypoints.temporal.project_workflow import ProjectWorkflow
from clip_factory.ports.project_results import (
    EditorInput,
    PreprocessSourceInput,
    TranscribeInput,
    ValidateSourceInput,
    WorkflowInput,
)


def test_completed_history_replays() -> None:
    asyncio.run(_test_completed_history_replays())


async def _test_completed_history_replays() -> None:
    @activity.defn(name="validate_source")
    async def validate(input: ValidateSourceInput):
        return await validate_source(input)

    @activity.defn(name="extract_audio")
    async def extract(input: PreprocessSourceInput):
        return await extract_audio(input)

    @activity.defn(name="transcribe")
    async def speech(input: TranscribeInput):
        return await transcribe(input)

    @activity.defn(name="prepare_editor")
    async def editor(input: EditorInput):
        return await prepare_editor(input)

    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="replay-test",
            workflows=[ProjectWorkflow],
            activities=[validate, extract, speech, editor],
        ):
            handle = await env.client.start_workflow(
                ProjectWorkflow.run,
                WorkflowInput("wf-replay", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "MANUAL", "en"),
                id="wf-replay",
                task_queue="replay-test",
            )
            for _ in range(100):
                if await handle.query(ProjectWorkflow.state) == "AWAITING_REVIEW":
                    break
                await env.sleep(timedelta(milliseconds=10))
            await handle.signal(ProjectWorkflow.complete_project)
            await handle.result()
            history = await handle.fetch_history()
        await Replayer(workflows=[ProjectWorkflow]).replay_workflow(history)
