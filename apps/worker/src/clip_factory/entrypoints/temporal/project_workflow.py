from datetime import timedelta
from typing import Any

from temporalio import workflow

from clip_factory.domain.job_state import JobState, transition
from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    prepare_manual_clip,
    transcribe,
    validate_source,
)
from clip_factory.entrypoints.temporal.child_workflows import AnalysisChildWorkflow, RenderBatchChildWorkflow
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
        self._active_activity: Any = None

    @workflow.query
    def state(self) -> str:
        return self._state.value

    @workflow.signal
    def cancel(self) -> None:
        self._cancelled = True
        if self._active_activity is not None:
            self._active_activity.cancel()

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
        self._set_state("validate")
        while True:
            try:
                await self._execute_activity(
                    validate_source,
                    ValidateSourceInput(payload.project_id, payload.source_asset_id),
                    start_to_close_timeout=timedelta(minutes=5),
                    heartbeat_timeout=timedelta(seconds=15),
                )
                if self._cancelled:
                    return self._cancelled_result(payload)
                break
            except Exception as exc:
                self._set_state(self._source_failure_event(exc))
                self._source_relinked = False
                await workflow.wait_condition(lambda: self._source_relinked or self._cancelled)
                if self._cancelled:
                    return self._cancelled_result(payload)
                self._set_state("relink")
        self._set_state("preprocess")
        prepared = await self._execute_activity(
            extract_audio,
            PreprocessSourceInput(payload.project_id, payload.source_asset_id),
            start_to_close_timeout=timedelta(hours=4),
            heartbeat_timeout=timedelta(seconds=15),
        )
        if self._cancelled:
            return self._cancelled_result(payload)
        self._set_state("transcribe")
        transcript = await self._execute_activity(
            transcribe,
            TranscribeInput(payload.project_id, prepared.audio_object, payload.language_tag),
            start_to_close_timeout=timedelta(hours=6),
            heartbeat_timeout=timedelta(seconds=30),
        )
        if self._cancelled:
            return self._cancelled_result(payload)
        if payload.mode == "MANUAL":
            await self._prepare_editor(payload, transcript, ())
            if self._cancelled:
                return self._cancelled_result(payload)
        else:
            self._set_state("analyze")
            analysis = await workflow.execute_child_workflow(
                AnalysisChildWorkflow.run,
                AnalysisChildInput.from_project(payload, transcript),
                id=f"{payload.workflow_id}-analysis",
            )
            self._set_state("preview")
            await self._prepare_editor(payload, transcript, analysis.candidates)
        return await self._review_loop(payload)

    @staticmethod
    def _source_failure_event(error: Exception) -> str:
        current: BaseException | None = error
        while current is not None:
            kind = str(getattr(current, "type", "")).upper()
            if kind:
                break
            current = getattr(current, "cause", None)
        else:
            kind = ""
        if "NOT_ALLOWED" in kind:
            return "source_not_allowed"
        if "CHANGED" in kind:
            return "source_changed"
        return "source_missing"

    def _set_state(self, event: str) -> None:
        self._state = transition(self._state, event)

    def _cancelled_result(self, payload: WorkflowInput) -> WorkflowResult:
        self._set_state("cancel")
        return WorkflowResult(payload.workflow_id, payload.project_id, "CANCELLED")

    async def _execute_activity(self, activity: Any, arg: Any, **kwargs: Any) -> Any:
        try:
            return await execute_activity_once(
                activity, arg, on_started=self._set_active_activity, **kwargs
            )
        except BaseException:
            if self._cancelled:
                return None
            raise
        finally:
            self._active_activity = None

    def _set_active_activity(self, handle: Any) -> None:
        self._active_activity = handle

    async def _prepare_editor(
        self, payload: WorkflowInput, transcript: ObjectReference, candidates: tuple[str, ...]
    ) -> None:
        await self._execute_activity(
            prepare_editor,
            EditorInput(payload.workflow_id, payload.project_id, transcript, candidates),
            start_to_close_timeout=timedelta(minutes=30),
            heartbeat_timeout=timedelta(seconds=15),
        )

    async def _review_loop(self, payload: WorkflowInput) -> WorkflowResult:
        while not self._complete_requested and not self._cancelled:
            self._set_state("review")
            await workflow.wait_condition(
                lambda: bool(self._review_commands) or self._complete_requested or self._cancelled
            )
            while self._review_commands and not self._cancelled:
                command = self._review_commands.pop(0)
                if command.kind == "PREPARE_MANUAL_CLIP" and command.manual_clip:
                    await self._execute_activity(
                        prepare_manual_clip,
                        command.manual_clip,
                        start_to_close_timeout=timedelta(hours=2),
                        heartbeat_timeout=timedelta(seconds=15),
                    )
                elif command.kind == "RENDER_BATCH" and command.render_batch:
                    self._set_state("render")
                    await workflow.execute_child_workflow(
                        RenderBatchChildWorkflow.run,
                        RenderBatchChildInput.from_command(command.render_batch),
                        id=f"{payload.workflow_id}-render-{command.render_batch.batch_id}",
                    )
                    self._set_state("review")
        if self._cancelled:
            return self._cancelled_result(payload)
        self._set_state("complete")
        return WorkflowResult.completed(payload.workflow_id, payload.project_id)
