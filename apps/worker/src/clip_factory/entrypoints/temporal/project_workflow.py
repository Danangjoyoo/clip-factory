from datetime import timedelta

from temporalio import workflow

from clip_factory.domain.job_state import JobState
from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    prepare_manual_clip,
    transcribe,
    validate_source,
)
from clip_factory.entrypoints.temporal.child_workflows import (
    AnalysisChildWorkflow,
    RenderBatchChildWorkflow,
)
from clip_factory.entrypoints.temporal.interim_retry import execute_activity_once
from clip_factory.ports.analysis_child import AnalysisChildInput
from clip_factory.ports.project_results import (
    EditorInput,
    PreprocessSourceInput,
    PrepareManualClipCommand,
    RenderBatchInput,
    ReviewCommand,
    TranscribeInput,
    ValidateSourceInput,
    WorkflowInput,
    WorkflowResult,
)
from clip_factory.ports.render_batch import RenderBatchChildInput
from clip_factory.ports.source_preprocessor import ObjectReference


@workflow.defn
class ProjectWorkflow:
    def __init__(self) -> None:
        self._state = JobState.QUEUED
        self._cancelled = False
        self._complete_requested = False
        self._source_relinked = False
        self._review_commands: list[ReviewCommand] = []

    @workflow.query
    def state(self) -> str:
        return self._state.value

    @workflow.signal
    def cancel(self) -> None:
        self._cancelled = True

    @workflow.signal
    def complete_project(self) -> None:
        self._complete_requested = True

    @workflow.signal
    def relink_source(self) -> None:
        self._source_relinked = True

    @workflow.signal
    def prepare_manual_clip(self, command: PrepareManualClipCommand) -> None:
        self._review_commands.append(ReviewCommand("PREPARE_MANUAL_CLIP", manual_clip=command))

    @workflow.signal
    def queue_render_batch(self, command: RenderBatchInput) -> None:
        self._review_commands.append(ReviewCommand("RENDER_BATCH", render_batch=command))

    @workflow.run
    async def run(self, payload: WorkflowInput) -> WorkflowResult:
        self._state = JobState.VALIDATING_SOURCE
        try:
            await execute_activity_once(
                validate_source,
                ValidateSourceInput(payload.project_id, payload.source_asset_id),
                start_to_close_timeout=timedelta(minutes=5),
                heartbeat_timeout=timedelta(seconds=15),
            )
        except Exception:
            self._state = JobState.SOURCE_MISSING
            await workflow.wait_condition(lambda: self._source_relinked or self._cancelled)
            if self._cancelled:
                self._state = JobState.CANCELLED
                return WorkflowResult(payload.workflow_id, payload.project_id, "CANCELLED")
            self._state = JobState.RELINKING_SOURCE
            await execute_activity_once(
                validate_source,
                ValidateSourceInput(payload.project_id, payload.source_asset_id),
                start_to_close_timeout=timedelta(minutes=5),
                heartbeat_timeout=timedelta(seconds=15),
            )
        self._state = JobState.PREPROCESSING
        prepared = await execute_activity_once(
            extract_audio,
            PreprocessSourceInput(payload.project_id, payload.source_asset_id),
            start_to_close_timeout=timedelta(hours=4),
            heartbeat_timeout=timedelta(seconds=15),
        )
        self._state = JobState.TRANSCRIBING
        transcript = await execute_activity_once(
            transcribe,
            TranscribeInput(payload.project_id, prepared.audio_object, payload.language_tag),
            start_to_close_timeout=timedelta(hours=6),
            heartbeat_timeout=timedelta(seconds=30),
        )
        if self._cancelled:
            self._state = JobState.CANCELLED
            return WorkflowResult(payload.workflow_id, payload.project_id, "CANCELLED")
        if payload.mode == "MANUAL":
            await self._prepare_editor(payload, transcript, ())
        else:
            self._state = JobState.ANALYZING
            analysis = await workflow.execute_child_workflow(
                AnalysisChildWorkflow.run,
                AnalysisChildInput.from_project(payload, transcript),
                id=f"{payload.workflow_id}-analysis",
            )
            self._state = JobState.GENERATING_PREVIEWS
            await self._prepare_editor(payload, transcript, analysis.candidates)
        return await self._review_loop(payload)

    async def _prepare_editor(
        self, payload: WorkflowInput, transcript: ObjectReference, candidates: tuple[str, ...]
    ) -> None:
        await execute_activity_once(
            prepare_editor,
            EditorInput(payload.workflow_id, payload.project_id, transcript, candidates),
            start_to_close_timeout=timedelta(minutes=30),
            heartbeat_timeout=timedelta(seconds=15),
        )

    async def _review_loop(self, payload: WorkflowInput) -> WorkflowResult:
        while not self._complete_requested and not self._cancelled:
            self._state = JobState.AWAITING_REVIEW
            await workflow.wait_condition(
                lambda: bool(self._review_commands) or self._complete_requested or self._cancelled
            )
            while self._review_commands:
                command = self._review_commands.pop(0)
                if command.kind == "PREPARE_MANUAL_CLIP" and command.manual_clip:
                    await execute_activity_once(
                        prepare_manual_clip,
                        command.manual_clip,
                        start_to_close_timeout=timedelta(hours=2),
                        heartbeat_timeout=timedelta(seconds=15),
                    )
                elif command.kind == "RENDER_BATCH" and command.render_batch:
                    self._state = JobState.RENDERING
                    await workflow.execute_child_workflow(
                        RenderBatchChildWorkflow.run,
                        RenderBatchChildInput.from_command(command.render_batch),
                        id=f"{payload.workflow_id}-render-{command.render_batch.batch_id}",
                    )
        if self._cancelled:
            self._state = JobState.CANCELLED
            return WorkflowResult(payload.workflow_id, payload.project_id, "CANCELLED")
        self._state = JobState.COMPLETED
        return WorkflowResult.completed(payload.workflow_id, payload.project_id)
