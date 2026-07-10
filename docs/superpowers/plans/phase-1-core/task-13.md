# Task 13: Deterministic Temporal Project Workflow

> **For agentic workers:** Use superpowers:test-driven-development. Run replay and time-skipping tests after every workflow change; all I/O remains in activities.

## Purpose and traceability

Implement design §§8, 10, 20, 22–23: durable canonical states, one local media job at a time, signals/cancellation, and restart-safe orchestration.

## Boundaries and files

- Requires Tasks 5, 8, and 10–12.
- Create: `apps/worker/src/clip_factory/domain/job_state.py`
- Create: `apps/worker/src/clip_factory/application/project_pipeline.py`
- Create: `apps/worker/src/clip_factory/ports/project_results.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/project_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/worker.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers.py`
- Create: `apps/worker/src/clip_factory/composition/worker_container.py`
- Test: `apps/worker/tests/domain/test_job_state.py`
- Test: `apps/worker/tests/application/test_project_pipeline.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_project_workflow.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_replay.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_worker.py`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Pin `temporalio==1.30.0` without a range.
- Modify contract workflow schemas only by a versioned compatible addition.
- Temporal decorators/types remain under `entrypoints/temporal`; application receives plain dataclasses and owned ports.

## RED → GREEN → REFACTOR

- [ ] **RED: write the manual-mode time-skipping workflow test.**

```python
async def test_manual_workflow_reaches_review_without_openai_activity() -> None:
    calls: list[str] = []
    async with await WorkflowEnvironment.start_time_skipping() as env:
        worker = Worker(env.client, task_queue="phase1-test", workflows=[ProjectWorkflow], activities=fake_activities(calls), max_concurrent_activity_task_executions=1)
        async with worker:
            handle = await env.client.start_workflow(ProjectWorkflow.run, manual_input(), id="workflow-001", task_queue="phase1-test")
            state = await handle.query(ProjectWorkflow.state)
            while state != "AWAITING_REVIEW":
                await env.sleep(timedelta(milliseconds=10))
                state = await handle.query(ProjectWorkflow.state)
            assert calls == ["validate_source", "extract_audio", "transcribe", "prepare_editor"]
            assert "analyze_highlights" not in calls
            await handle.signal(ProjectWorkflow.complete_project)
            assert await handle.result() == completed_result(status="COMPLETED")
```

- [ ] Run `uv run --directory apps/worker pytest tests/entrypoints/temporal/test_project_workflow.py -q`; expect import FAIL.

- [ ] **GREEN: create exact states/transitions and workflow shell.**

```python
class JobState(StrEnum):
    DRAFT = "DRAFT"
    VALIDATING_SOURCE = "VALIDATING_SOURCE"
    UPLOADING = "UPLOADING"
    QUEUED = "QUEUED"
    PREPROCESSING = "PREPROCESSING"
    TRANSCRIBING = "TRANSCRIBING"
    VERIFYING_BUDGET = "VERIFYING_BUDGET"
    AWAITING_BUDGET = "AWAITING_BUDGET"
    ANALYZING = "ANALYZING"
    GENERATING_PREVIEWS = "GENERATING_PREVIEWS"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    RENDERING = "RENDERING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    SOURCE_MISSING = "SOURCE_MISSING"
    SOURCE_CHANGED = "SOURCE_CHANGED"
    SOURCE_NOT_ALLOWED = "SOURCE_NOT_ALLOWED"
    RELINKING_SOURCE = "RELINKING_SOURCE"
    PAID_CALL_UNCERTAIN = "PAID_CALL_UNCERTAIN"
```

```python
@workflow.defn
class ProjectWorkflow:
    def __init__(self) -> None:
        self._state = JobState.QUEUED
        self._cancelled = False
        self._complete_requested = False
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
    def prepare_manual_clip(self, command: PrepareManualClipCommand) -> None:
        self._review_commands.append(ReviewCommand("PREPARE_MANUAL_CLIP", command, None))

    @workflow.signal
    def queue_render_batch(self, command: RenderBatchInput) -> None:
        self._review_commands.append(ReviewCommand("RENDER_BATCH", None, command))

    @workflow.run
    async def run(self, payload: WorkflowInput) -> WorkflowResult:
        self._state = JobState.VALIDATING_SOURCE
        source = await workflow.execute_activity(validate_source, ValidateSourceInput(payload.project_id, payload.source_asset_id), start_to_close_timeout=timedelta(minutes=5), heartbeat_timeout=timedelta(seconds=15))
        self._state = JobState.PREPROCESSING
        prepared = await workflow.execute_activity(preprocess_source, PreprocessSourceInput(payload.project_id, payload.source_asset_id), start_to_close_timeout=timedelta(hours=4), heartbeat_timeout=timedelta(seconds=15))
        self._state = JobState.TRANSCRIBING
        transcript = await workflow.execute_activity(transcribe, TranscribeInput(payload.project_id, prepared.audio_object, payload.language_tag), start_to_close_timeout=timedelta(hours=6), heartbeat_timeout=timedelta(seconds=30))
        if self._cancelled:
            raise CancelledError("project cancelled")
        if payload.mode == "MANUAL":
            await workflow.execute_activity(prepare_editor, EditorInput(payload, transcript, ()), start_to_close_timeout=timedelta(minutes=30))
            return await self._review_loop(payload)
        self._state = JobState.VERIFYING_BUDGET
        analysis = await workflow.execute_child_workflow(AnalysisWorkflow.run, AnalysisInput(payload, transcript), id=f"{payload.workflow_id}-analysis")
        self._state = JobState.GENERATING_PREVIEWS
        result = await workflow.execute_activity(prepare_editor, EditorInput(payload, transcript, analysis.candidates), start_to_close_timeout=timedelta(hours=2), heartbeat_timeout=timedelta(seconds=15))
        return await self._review_loop(payload)

    async def _review_loop(self, payload: WorkflowInput) -> WorkflowResult:
        while not self._complete_requested and not self._cancelled:
            self._state = JobState.AWAITING_REVIEW
            await workflow.wait_condition(lambda: bool(self._review_commands) or self._complete_requested or self._cancelled)
            while self._review_commands:
                command = self._review_commands.pop(0)
                if command.kind == "PREPARE_MANUAL_CLIP":
                    await workflow.execute_activity(prepare_manual_clip, command.manual_clip, start_to_close_timeout=timedelta(hours=2), heartbeat_timeout=timedelta(seconds=15))
                elif command.kind == "RENDER_BATCH":
                    self._state = JobState.RENDERING
                    await workflow.execute_child_workflow(RenderBatchWorkflow.run, command.render_batch, id=f"{payload.workflow_id}-render-{command.render_batch.batch_id}")
        if self._cancelled:
            raise CancelledError("project cancelled")
        self._state = JobState.COMPLETED
        return WorkflowResult.completed(payload.workflow_id, payload.project_id)
```

- [ ] Run the test; expect PASS.

- [ ] **RED: add tests for cancellation, source missing/change waits, activity retry, worker restart, review-loop render/manual signals, replay, and payload privacy.** Assert the workflow remains open in `AWAITING_REVIEW`, serializes two render batches, returns to review after each, and returns only after `complete_project` or cancellation. Use Temporal history from a completed fake run and `Replayer(workflows=[ProjectWorkflow]).replay_workflow(history)`; seed a forbidden `datetime.now()` call and witness nondeterminism before removing it. Decode every activity/workflow payload and assert it contains only IDs, sanitized probes, and MinIO object references—never local/temp paths, locator API responses, transcript text, media bytes, or credentials.

- [ ] **GREEN:** map source exceptions to waiting states, use `workflow.wait_condition` for `source_relinked`, and propagate cancellation scopes to activities. Each activity execution sets Temporal `RetryPolicy(maximum_attempts=1)`; Task 31 supplies the deterministic workflow timer helper for retryable activities. Configure worker activity concurrency `1` and workflow concurrency `20`.

- [ ] Run all Temporal tests; expect PASS.

- [ ] **REFACTOR:** centralize state transitions in a pure `transition(current,event)` table and test every allowed/forbidden pair. Activity implementations call application services; they contain no business branch beyond mapping and heartbeat/cancellation plumbing.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_job_state.py tests/entrypoints/temporal -q
uv run --directory apps/worker lint-imports
pnpm test:contracts
git diff --check
```

Expected: replay succeeds, manual path never schedules analysis, and worker restart does not repeat completed activities.

**Suggested commit:** `feat: add deterministic temporal project workflow`
