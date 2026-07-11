# Task 12: Deterministic Per-Clip Publication Workflow and Recovery

> **Implementation mode:** Complete after Tasks 3, 5, 7, and 11. This task owns publication orchestration, internal progress callbacks, restart/idempotency, final-upload uncertainty/reconciliation, processing polling, cancellation, and thumbnail warning semantics.

## Purpose

Create one independently durable Temporal workflow per clip publication. Before the final chunk it resumes a persisted offset/session without duplicating local intent. It durably marks final dispatch; if YouTube's final result/video ID is lost, it pauses in `UPLOAD_OUTCOME_UNCERTAIN`, reconciles the channel, and never creates a replacement without explicit duplicate-risk acknowledgement. Known video IDs proceed to bounded processing polling; sibling workflows remain isolated and cancellation never deletes a remote video.

## Requirements and traceability

- YouTube design §§11–14: preconditions, immutable snapshot, resumable upload, video ID, processing poll, per-clip workflow/state, restart/cancel/idempotency, durable final-dispatch marker, `UPLOAD_OUTCOME_UNCERTAIN`, reconciliation, explicit duplicate-risk acknowledgement.
- YouTube design §§12, 15–16: private `publishAt`, offline schedule ownership, warning-only thumbnail, sanitized progress/errors.
- Testing/acceptance: pre-final Temporal restart resumes one intent; lost final result starts no automatic replacement; private upload ID/URL, three independent schedules, and failed upload/thumbnail isolation.
- Core architecture: Python workflows deterministic; network/clock/object store/internal API/Keychain work only in activities/adapters; Next.js remains sole PostgreSQL writer.

## Clean Architecture ownership

- **Web application:** start preconditions, immutable snapshot, transaction/idempotency, event-state policy, replacement-attempt creation.
- **Worker workflow:** deterministic sequence and timers only.
- **Worker activities/adapters:** attempt checkpoint HTTP, Keychain/token, object-store range read, YouTube HTTP, progress callback, thumbnail bytes.
- **Ports:** web `YouTubePublicationWorkflowScheduler`; worker consumes Task 11 `YouTubePublisher` plus object-store/checkpoint/event ports.
- **DTO boundaries:** API start/event DTOs, Entity snapshots, Record rows, Task 1 Temporal payloads, and Google Client DTOs remain separate.

## Files

- Modify: `packages/contracts/schema/schema-bodies.mjs`
- Regenerate: `packages/contracts/schema/youtube-publishing.schema.json`
- Regenerate: `packages/contracts/src/generated/youtube-publishing.ts`
- Regenerate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/youtube_publishing.py`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/youtube-publication-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/start-youtube-publication.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/start-youtube-publication.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/apply-publication-event.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/apply-publication-event.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/clients/temporal-youtube-publication-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/start-publication-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/publication-event-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/publication-event.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-publication.controller.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/publications/route.ts`
- Create: `apps/web/src/app/api/v1/youtube/publications/[publicationId]/cancel/route.ts`
- Create: `apps/web/src/app/api/v1/youtube/publications/[publicationId]/retry/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/publications/[publicationId]/checkpoint/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/publications/[publicationId]/events/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/publications/[publicationId]/attempts/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-publication.controller.test.ts`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/publication_checkpoint.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/publication_checkpoint_http_adapter.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/publication_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/publication_activities.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py`
- Create: `tests/integration/youtube-publishing/publication-workflow-restart.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`

## Prerequisites

- Tasks 3–5 persistence/data services and Task 2 policies are green.
- Task 7 connection refresh and Task 11 publisher contracts are green.
- Phase 1 render read policy provides successful render metadata; Task 11's `ArtifactByteSourcePort` provides bounded half-open byte ranges through its MinIO adapter.

## Interfaces

Web scheduler:

```ts
export interface YouTubePublicationWorkflowScheduler {
  start(workflowId: WorkflowId, input: PublicationWorkflowInputV1): Promise<void>;
  cancel(workflowId: WorkflowId): Promise<void>;
  signalCredentialsReconnected(workflowId: WorkflowId): Promise<void>;
}
```

Worker checkpoint types:

```python
from dataclasses import dataclass
from typing import Protocol, TypeAlias


@dataclass(frozen=True, slots=True)
class PublicationCheckpoint:
    attempt_id: str
    attempt_number: int
    resumable_session_reference: str | None
    acknowledged_bytes: int
    total_bytes: int
    youtube_video_id: str | None
    final_chunk_dispatch_started_at: str | None
    outcome_uncertain_at: str | None
    reconciliation_result: str | None
    duplicate_risk_acknowledged: bool
    cancel_requested: bool


@dataclass(frozen=True, slots=True)
class PublicationUploadProgressEvent:
    type: str
    attempt_id: str
    acknowledged_bytes: int
    progress_percent: int


@dataclass(frozen=True, slots=True)
class PublicationVideoCreatedEvent:
    type: str
    attempt_id: str
    video_id: str
    video_url: str
    created_at: str


@dataclass(frozen=True, slots=True)
class PublicationTerminalEvent:
    type: str
    attempt_id: str
    terminal_state: str
    thumbnail_warning_code: str | None
    safe_reason_code: str | None


PublicationProgressEvent: TypeAlias = (
    PublicationUploadProgressEvent
    | PublicationVideoCreatedEvent
    | PublicationTerminalEvent
)


class PublicationCheckpointPort(Protocol):
    async def load(self, publication_id: str) -> PublicationCheckpoint:
        raise NotImplementedError

    async def save_session(self, publication_id: str, attempt_id: str, reference: str) -> None:
        raise NotImplementedError

    async def save_progress(self, publication_id: str, attempt_id: str, acknowledged: int) -> None:
        raise NotImplementedError

    async def attach_video(self, publication_id: str, attempt_id: str, video_id: str) -> None:
        raise NotImplementedError

    async def start_replacement_attempt(self, publication_id: str) -> PublicationCheckpoint:
        raise NotImplementedError

    async def report_terminal(
        self,
        publication_id: str,
        event: PublicationProgressEvent,
    ) -> None:
        raise NotImplementedError
```

The HTTP adapter converts `PublicationProgressEvent` to the generated closed `PublicationProgressEventV1` union from Task 1; no raw provider response is accepted.

## RED-GREEN-REFACTOR cycle 1: start preconditions, immutable snapshot, and idempotency

- [ ] **RED 1.1 — Write application tests first.**

Create `start-youtube-publication.service.test.ts`:

```ts
import { expect, it } from 'vitest';

import { StartYouTubePublicationService } from './start-youtube-publication.service';

it.each([
  ['render failed', { renderStatus: 'FAILED' }, 'render is not successful'],
  ['landscape render', { width: 1920, height: 1080 }, 'render must be 9:16'],
  ['long render', { durationMs: 180_001 }, 'render exceeds 180 seconds'],
  ['connection reauth', { connectionState: 'REAUTH_REQUIRED' }, 'YouTube reconnect required'],
  ['draft unapproved', { draftState: 'AWAITING_APPROVAL' }, 'approved metadata required'],
])('rejects %s before creating a publication', async (_name, overrides, message) => {
  const dependencies = makePublicationStartDependencies(overrides);
  const service = new StartYouTubePublicationService(dependencies);
  await expect(service.start(makeStartPublicationInput())).rejects.toThrow(message);
  expect(dependencies.publications.insert).not.toHaveBeenCalled();
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
});

it('atomically snapshots approved metadata and starts one UUID-only workflow', async () => {
  const dependencies = makePublicationStartDependencies();
  const service = new StartYouTubePublicationService(dependencies);
  const result = await service.start(makeStartPublicationInput({
    idempotencyKey: 'publish:clip-1:primary:1',
    confirmed: true,
  }));
  expect(dependencies.unitOfWork.execute).toHaveBeenCalledOnce();
  expect(dependencies.publications.insert).toHaveBeenCalledWith(expect.objectContaining({
    metadataSnapshot: makePublishingMetadataEntity(),
    state: 'READY_TO_UPLOAD',
    idempotencyKey: 'publish:clip-1:primary:1',
  }));
  expect(dependencies.attempts.insert).toHaveBeenCalledWith(expect.objectContaining({
    attemptNumber: 1,
    acknowledgedBytes: 0n,
  }));
  expect(dependencies.scheduler.start).toHaveBeenCalledWith(
    expect.stringMatching(/^youtube-publication:/),
    expect.objectContaining({
      contractVersion: 1,
      connectionId: dependencies.connection.id,
      renderObject: makeObjectReference('renders/clip-1/final.mp4'),
    }),
  );
  expect(JSON.stringify(dependencies.scheduler.start.mock.calls)).not.toMatch(/token|Prisma|Google/);
  expect(result.state).toBe('READY_TO_UPLOAD');
});

it('reuses the publication and idempotently repairs workflow start on a repeated key', async () => {
  const dependencies = makePublicationStartDependencies({ existingPublication: makePublicationEntity() });
  const service = new StartYouTubePublicationService(dependencies);
  await expect(service.start(makeStartPublicationInput())).resolves.toEqual(
    dependencies.existingPublication,
  );
  expect(dependencies.publications.insert).not.toHaveBeenCalled();
  expect(dependencies.attempts.insert).not.toHaveBeenCalled();
  expect(dependencies.scheduler.start).toHaveBeenCalledWith(
    dependencies.existingPublication.workflowId,
    expect.objectContaining({ publicationId: dependencies.existingPublication.id }),
  );
});
```

Append these policy cases so Task 2 remains the single legality decision:

```ts
it.each([
  ['PRIVATE_REVIEW', false, null, 'PRIVATE_REVIEW'],
  ['SCHEDULED', true, makeSchedule('Asia/Tokyo'), 'SCHEDULED'],
  ['SCHEDULED', true, makeSchedule('America/New_York'), 'SCHEDULED'],
  ['SCHEDULED', true, makeSchedule('UTC'), 'SCHEDULED'],
] as const)('applies visibility policy for %s', async (requested, verified, schedule, expected) => {
  const service = new StartYouTubePublicationService(
    makePublicationStartDependencies({ apiProjectVerified: verified }),
  );
  await expect(service.start(makeStartPublicationInput({ requested, schedule })))
    .resolves.toMatchObject({ visibility: expected, schedule });
});

it('rejects scheduling for an unverified API project', async () => {
  const service = new StartYouTubePublicationService(
    makePublicationStartDependencies({ apiProjectVerified: false }),
  );
  await expect(service.start(makeStartPublicationInput({
    requested: 'SCHEDULED',
    schedule: makeSchedule('Asia/Tokyo'),
  }))).rejects.toThrow('unverified API projects support private review only');
});
```

- [ ] **RED 1.2 — Witness missing service.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/start-youtube-publication.service.test.ts
```

Expected RED: service/port signature shells collect; a confirmed start creates no publication/attempt transaction instead of one publication plus attempt 1.

- [ ] **GREEN 1.3 — Implement transactional start.**

Require `confirmed === true`, load the successful render/healthy connection/approved draft through narrow ports, call `assertYouTubeShortsEligible`, `parsePublishingMetadata`, and `decidePublicationVisibility`, then freeze/copy the approved metadata. In one Phase 1 unit-of-work/idempotency receipt, insert `Publication` and attempt 1. After commit, always call the scheduler with the persisted workflow ID `youtube-publication:<publicationId>`, including on an idempotent repeat. Temporal `AlreadyStarted` is success; a pre-start transport failure returns safe `PUBLICATION_WORKFLOW_START_DEFERRED` while preserving the row so repeating the same idempotency key repairs the start rather than creating another publication.

```ts
const created = await this.unitOfWork.execute(async (transaction) => {
  const existing = await transaction.publications.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;
  const publication = await transaction.publications.insert({
    ...validated,
    metadataSnapshot: structuredClone(parsedMetadata),
    workflowId: `youtube-publication:${publicationId}`,
  });
  await transaction.publicationAttempts.insert({
    publicationId: publication.id,
    attemptNumber: 1,
    idempotencyKey: `${input.idempotencyKey}:attempt:1`,
    totalBytes: render.byteSize,
  });
  return publication;
});
await this.scheduler.start(created.workflowId, publicationEntityToWorkflowInput(created));
return created;
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/start-youtube-publication.service.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Prevent post-approval mutation from changing the request.**

Add this exact test before refactoring:

```ts
it('keeps the publication snapshot when the draft changes later', async () => {
  const dependencies = makePublicationStartDependencies();
  const service = new StartYouTubePublicationService(dependencies);
  const publication = await service.start(makeStartPublicationInput());
  dependencies.approvedDraft.metadata.title = 'Changed after snapshot';
  expect(publication.metadataSnapshot.title).toBe('Reviewed title');
  expect(Object.isFrozen(publication.metadataSnapshot)).toBe(true);
});
```

Witness RED if references are shared, deep-copy/freeze arrays/object, and rerun.

## RED-GREEN-REFACTOR cycle 2: deterministic workflow, resume, replacement attempts, and reauth pause

- [ ] **RED 2.1 — Write Temporal time-skipping tests first.**

Create `test_publication_workflow.py` with complete activity fakes. The pre-final restart/idempotency test is:

```python
@pytest.mark.asyncio
async def test_pre_final_restart_probes_persisted_session_and_completes_one_intent() -> None:
    harness = await PublicationWorkflowHarness.start(
        checkpoint=PublicationCheckpoint(
            attempt_id='attempt-1',
            attempt_number=1,
            resumable_session_reference='https://upload.test/session/1?upload_id=sentinel',
            acknowledged_bytes=8_388_608,
            total_bytes=12_582_912,
            youtube_video_id=None,
            final_chunk_dispatch_started_at=None,
            outcome_uncertain_at=None,
            reconciliation_result=None,
            duplicate_risk_acknowledged=False,
            cancel_requested=False,
        ),
        crash_after_remote_completion_once=True,
    )
    result = await harness.run(make_publication_workflow_input())
    assert result.state == 'PRIVATE_REVIEW'
    assert result.youtube_video_id == 'video-safe-1'
    assert harness.youtube.created_video_count == 1
    assert harness.youtube.probe_count >= 1
    assert harness.checkpoints.attached_video_ids == ['video-safe-1']
```

Add a lost-final-result test before implementation:

```python
@pytest.mark.asyncio
async def test_lost_final_result_pauses_and_never_replaces_automatically() -> None:
    harness = await PublicationWorkflowHarness.start(
        final_chunk_creates_video_then_loses_response=True,
        subsequent_session_probe_status=404,
        reconciliation_result='INCONCLUSIVE',
    )
    handle = await harness.start_workflow(make_publication_workflow_input())
    await harness.wait_for_state('UPLOAD_OUTCOME_UNCERTAIN')
    assert harness.checkpoints.final_dispatch_mark_count == 1
    assert harness.youtube.created_video_count == 1
    assert harness.youtube.created_session_count == 1
    assert harness.checkpoints.replacement_attempt_count == 0
    assert harness.events[-1].required_action == (
        'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK'
    )
    await harness.restart_worker()
    await harness.advance_time(minutes=30)
    assert harness.youtube.created_session_count == 1
    await handle.cancel()
```

Add these exact assertions in separate tests:

```python
assert expired_session_result.attempt_number == 2
assert expired_session_harness.checkpoints.replacement_attempt_count == 1
assert expired_session_harness.checkpoints.final_dispatch_mark_count == 0
assert reauth_harness.activities.upload_calls == 0
assert reauth_harness.events[-1].safe_reason_code == 'REAUTH_REQUIRED'
assert cancelled_before_id.youtube.created_video_count == 0
assert cancelled_after_id.youtube.deleted_video_ids == []
```

The expired-session fixture sets `final_chunk_dispatch_started_at=None`. Append these reconciliation tests:

```python
@pytest.mark.asyncio
async def test_reconciliation_found_attaches_video_without_replacement() -> None:
    harness = await PublicationWorkflowHarness.start(
        checkpoint=make_uncertain_checkpoint(),
        reconciliation_result=UploadReconciliationResult(
            result='VIDEO_FOUND',
            video_id='video-reconciled-1',
            video_url='https://youtu.be/video-reconciled-1',
        ),
    )
    result = await harness.run(make_publication_workflow_input())
    assert result.youtube_video_id == 'video-reconciled-1'
    assert harness.checkpoints.replacement_attempt_count == 0


@pytest.mark.asyncio
async def test_reconciliation_no_match_waits_for_durable_duplicate_risk_acknowledgement() -> None:
    harness = await PublicationWorkflowHarness.start(
        checkpoint=make_uncertain_checkpoint(),
        reconciliation_result=UploadReconciliationResult('NO_MATCH_FOUND', None, None),
    )
    handle = await harness.start_workflow(make_publication_workflow_input())
    await harness.wait_for_state('UPLOAD_OUTCOME_UNCERTAIN')
    assert harness.checkpoints.replacement_attempt_count == 0
    await harness.record_duplicate_risk_acknowledgement()
    await handle.signal(YouTubePublicationWorkflow.acknowledge_duplicate_risk)
    await harness.wait_for_attempt_number(2)
    assert harness.checkpoints.replacement_attempt_count == 1


@pytest.mark.asyncio
async def test_restart_between_ack_commit_and_signal_recovers_from_checkpoint() -> None:
    harness = await PublicationWorkflowHarness.start(
        checkpoint=make_uncertain_checkpoint(),
        reconciliation_result=UploadReconciliationResult('INCONCLUSIVE', None, None),
    )
    await harness.start_workflow(make_publication_workflow_input())
    await harness.wait_for_state('UPLOAD_OUTCOME_UNCERTAIN')
    await harness.record_duplicate_risk_acknowledgement()
    await harness.restart_worker()  # intentionally do not deliver the wake-up signal
    await harness.advance_time(seconds=31)
    await harness.wait_for_attempt_number(2)
    assert harness.checkpoints.replacement_attempt_count == 1
```

Witness RED on automatic replacement or ignored acknowledgement, implement the guard, and rerun.

The reauth test signals `credentials_reconnected` and then expects upload/poll to resume. The cancellation tests assert terminal `CANCELLED` and no later poll/thumbnail calls.

- [ ] **RED 2.2 — Witness missing workflow/activities.**

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py -q
```

Expected RED: workflow/activity signature shells collect; the time-skipping harness records zero create-session activities instead of one private resumable session.

- [ ] **GREEN 2.3 — Implement deterministic workflow algorithm.**

Add Task 1 generated unions for checkpoint and progress/terminal events. Use this workflow-owned sequence:

```python
@workflow.defn
class YouTubePublicationWorkflow:
    def __init__(self) -> None:
        self._cancel_requested = False
        self._credentials_reconnected = False
        self._duplicate_risk_wakeup = False

    @workflow.signal
    def request_cancel(self) -> None:
        self._cancel_requested = True

    @workflow.signal
    def credentials_reconnected(self) -> None:
        self._credentials_reconnected = True

    @workflow.signal
    def acknowledge_duplicate_risk(self) -> None:
        self._duplicate_risk_wakeup = True

    @workflow.run
    async def run(self, payload: PublicationWorkflowInputV1) -> PublicationWorkflowResultV1:
        checkpoint = await load_checkpoint(payload.publication_id)
        while checkpoint.youtube_video_id is None:
            if self._cancel_requested or checkpoint.cancel_requested:
                return await report_cancelled(payload, checkpoint, remote_video_exists=False)
            if checkpoint.final_chunk_dispatch_started_at is not None:
                reconciliation = await reconcile_channel(payload, checkpoint)
                if reconciliation.video_id is not None:
                    checkpoint = await attach_reconciled_video(
                        payload,
                        checkpoint,
                        reconciliation,
                    )
                    break
                await report_upload_outcome_uncertain(payload, checkpoint, reconciliation)
                while not checkpoint.duplicate_risk_acknowledged:
                    try:
                        await workflow.wait_condition(
                            lambda: self._duplicate_risk_wakeup or self._cancel_requested,
                            timeout=timedelta(seconds=30),
                        )
                    except TimeoutError:
                        pass
                    if self._cancel_requested:
                        break
                    self._duplicate_risk_wakeup = False
                    checkpoint = await load_checkpoint(payload.publication_id)
                if self._cancel_requested:
                    return await report_cancelled(
                        payload,
                        checkpoint,
                        remote_video_exists=True,
                    )
                checkpoint = await start_acknowledged_replacement_attempt(
                    payload.publication_id,
                    checkpoint.attempt_id,
                )
                self._duplicate_risk_wakeup = False
            try:
                checkpoint = await upload_next_verified_chunk(payload, checkpoint)
            except ResumableSessionExpired:
                if checkpoint.final_chunk_dispatch_started_at is not None:
                    checkpoint = await mark_upload_outcome_uncertain(
                        payload,
                        checkpoint,
                        'SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH',
                    )
                    continue
                if checkpoint.attempt_number >= 3:
                    return await report_failed(payload, checkpoint, 'RESUMABLE_SESSION_EXPIRED')
                checkpoint = await start_replacement_attempt(payload.publication_id)
            except FinalUploadOutcomeUncertain:
                checkpoint = await mark_upload_outcome_uncertain(
                    payload,
                    checkpoint,
                    'FINAL_UPLOAD_RESULT_UNKNOWN',
                )
            except ReauthRequired:
                await report_waiting_for_reauth(payload, checkpoint)
                await workflow.wait_condition(
                    lambda: self._credentials_reconnected or self._cancel_requested
                )
                self._credentials_reconnected = False
        if self._cancel_requested:
            return await report_cancelled(payload, checkpoint, remote_video_exists=True)
        processing = await poll_until_terminal(payload, checkpoint)
        if processing.state == 'FAILED':
            return await report_failed(payload, checkpoint, processing.failure_code)
        thumbnail = await attempt_thumbnail(payload, checkpoint)
        terminal_state = 'SCHEDULED' if payload.visibility == 'SCHEDULED' else 'PRIVATE_REVIEW'
        return await report_success(payload, checkpoint, thumbnail, terminal_state)
```

The helper names above are workflow-local coroutines that call registered activities with generated payloads; they contain no adapter imports. `upload_next_verified_chunk` always probes a known session before reading/sending a chunk, creates a session only when checkpoint reference is null, reads only the required object-store byte range, retries transient `500/502/503/504` at most five times with provider `Retry-After` or bounded exponential delays while heartbeating, then saves monotonic progress through the checkpoint port. Before the chunk whose end equals `totalBytes`, a separate activity commits `final_chunk_dispatch_started_at` in PostgreSQL and reloads that checkpoint; the send cannot begin until the marker is visible. A pre-final `404` raises `ResumableSessionExpired`. A lost final result or post-marker `404` raises/records `FinalUploadOutcomeUncertain`, not ordinary expiry.

`reconcile_channel` uses Task 11's readonly adapter to inspect the authorized channel's recent uploads beginning five minutes before final dispatch. It compares the immutable title, description, duration, category, and dispatch-time window. Exactly one strong match returns `VIDEO_FOUND`; zero returns `NO_MATCH_FOUND`; multiple/partial/provider-error returns `INCONCLUSIVE`. Run three deterministic polls at 30, 60, and 120 seconds before presenting the unresolved state. No result automatically authorizes replacement. `start_acknowledged_replacement_attempt` succeeds only when PostgreSQL already records a reconciliation result and `duplicate_risk_acknowledged_at`; otherwise it is a nonretryable application error.

Poll via activity and deterministic `workflow.sleep` delays `[5, 10, 20, 40, 60]` seconds capped at 60; stop after six hours with safe failure `YOUTUBE_PROCESSING_TIMEOUT` while retaining the remote video. Thumbnail activity retries transient errors at most twice, then returns a warning.

Run Temporal tests. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Replay and inspect workflow determinism.**

Capture/replay workflow histories for upload restart, reauth wait/signal, cancellation, and schedule success. Static-import test must reject `httpx`, `keyring`, `redis`, `openai`, filesystem/object-store clients, random, and wall clock in `publication_workflow.py`. Rerun workflow tests/import-linter.

```python
@pytest.mark.parametrize(
    'fixture_name',
    ['upload_restart', 'reauth_signal', 'cancel_after_video', 'scheduled_success'],
)
@pytest.mark.asyncio
async def test_publication_history_replays(fixture_name: str) -> None:
    replayer = Replayer(workflows=[YouTubePublicationWorkflow])
    history = WorkflowHistory.from_json(load_history_fixture(f'{fixture_name}.json'))
    await replayer.replay_workflow(history)
```

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py -q
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 3: authenticated checkpoint/events and state application

- [ ] **RED 3.1 — Write application event tests first.**

Create `apply-publication-event.service.test.ts`:

```ts
it('attaches remote identity exactly once before processing', async () => {
  const service = makePublicationEventService({ state: 'UPLOADING', youtubeVideoId: null });
  await service.apply(makeEvent({
    type: 'VIDEO_CREATED',
    videoId: 'video-safe-1',
    videoUrl: 'https://youtu.be/video-safe-1',
    createdAt: '2026-07-11T01:00:00Z',
  }));
  expect(publications.attachRemoteVideo).toHaveBeenCalledOnce();
  expect(publications.updateState).toHaveBeenCalledWith(expect.objectContaining({
    nextState: 'YOUTUBE_PROCESSING',
  }));
});

it('keeps success when thumbnail returns a warning', async () => {
  const service = makePublicationEventService({ state: 'YOUTUBE_PROCESSING' });
  await service.apply(makeEvent({
    type: 'SUCCEEDED',
    terminalState: 'PRIVATE_REVIEW',
    thumbnailWarningCode: 'THUMBNAIL_FORBIDDEN',
  }));
  expect(publications.updateState).toHaveBeenCalledWith(expect.objectContaining({
    nextState: 'PRIVATE_REVIEW',
    thumbnailWarningCode: 'THUMBNAIL_FORBIDDEN',
    sanitizedErrorCode: null,
  }));
});

it('applies duplicate progress idempotently and never decreases bytes', async () => {
  const service = makePublicationEventService({ acknowledgedBytes: 8_388_608n });
  await service.apply(makeEvent({ type: 'UPLOAD_PROGRESS', acknowledgedBytes: '4' }));
  expect(attempts.saveProgress).toHaveBeenCalledWith(expect.objectContaining({
    acknowledgedBytes: 8_388_608n,
  }));
});

it('records final-upload uncertainty and blocks an unacknowledged replacement', async () => {
  const service = makePublicationEventService({ state: 'UPLOADING' });
  await service.apply(makeEvent({
    type: 'UPLOAD_OUTCOME_UNCERTAIN',
    finalChunkDispatchedAt: '2026-07-11T01:00:00Z',
    safeReasonCode: 'FINAL_UPLOAD_RESULT_UNKNOWN',
    requiredAction: 'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK',
  }));
  expect(publications.updateState).toHaveBeenCalledWith(expect.objectContaining({
    nextState: 'UPLOAD_OUTCOME_UNCERTAIN',
  }));
  await expect(service.startReplacementAttempt({
    publicationId,
    expectedAttemptNumber: 1,
    duplicateRiskAcknowledged: false,
  })).rejects.toMatchObject({ code: 'UPLOAD_DUPLICATE_RISK_ACKNOWLEDGEMENT_REQUIRED' });
  expect(attempts.insert).not.toHaveBeenCalled();
});

it('refuses generic recovery and permits ordinary retry only with locked pre-final evidence', async () => {
  const service = makePublicationEventService({
    state: 'FAILED',
    attempt: makeAttempt({
      finalChunkDispatchStartedAt: new Date('2026-07-11T01:00:00Z'),
      outcomeUncertainAt: null,
      reconciliationCheckedAt: null,
      reconciliationResult: null,
      duplicateRiskAcknowledgedAt: null,
      youtubeVideoId: null,
    }),
  });
  await expect(service.retryFailed({ publicationId, expectedAttemptNumber: 1, confirmed: true }))
    .rejects.toMatchObject({ code: 'FINAL_DISPATCH_RECOVERY_REQUIRED' });
  expect(publications.updateState).not.toHaveBeenCalledWith(expect.objectContaining({
    nextState: 'READY_TO_UPLOAD',
  }));
  expect(attempts.insert).not.toHaveBeenCalled();
});

it('creates an acknowledged uncertain replacement through the guarded policy only', async () => {
  const service = makePublicationEventService({
    state: 'UPLOAD_OUTCOME_UNCERTAIN',
    attempt: makeAttempt({
      finalChunkDispatchStartedAt: fixedTime,
      outcomeUncertainAt: new Date(fixedTime.getTime() + 1_000),
      reconciliationCheckedAt: new Date(fixedTime.getTime() + 1_500),
      reconciliationResult: 'NO_MATCH_FOUND',
      duplicateRiskAcknowledgedAt: new Date(fixedTime.getTime() + 2_000),
      youtubeVideoId: null,
    }),
  });
  await service.startReplacementAttempt({
    publicationId,
    expectedAttemptNumber: 1,
    duplicateRiskAcknowledged: true,
    confirmed: true,
  });
  expect(publications.updateState).toHaveBeenCalledWith(expect.objectContaining({
    nextState: 'READY_TO_UPLOAD',
  }));
  expect(attempts.insert).toHaveBeenCalledOnce();
});
```

Append this table and the bounded-attempt assertion:

```ts
it.each([
  ['PRIVATE_REVIEW', makeEvent({ type: 'UPLOAD_PROGRESS' }), 'INVALID_PUBLICATION_TRANSITION'],
  ['UPLOADING', makeEvent({ type: 'FAILED', safeCode: 'UPLOAD_REJECTED', safeMessage: 'Upload rejected.' }), null],
  ['UPLOADING', makeEvent({ type: 'WAITING_FOR_REAUTH' }), null],
  ['UPLOADING', makeEvent({ type: 'CANCELLED', remoteVideoExists: false }), null],
  ['YOUTUBE_PROCESSING', makeEvent({ type: 'CANCELLED', remoteVideoExists: true }), null],
] as const)('applies %s event policy', async (state, event, errorCode) => {
  const service = makePublicationEventService({ state });
  const operation = service.apply(event);
  if (errorCode) await expect(operation).rejects.toMatchObject({ code: errorCode });
  else await expect(operation).resolves.toBeDefined();
});

it('refuses a fourth upload attempt', async () => {
  const service = makePublicationEventService({ attemptNumber: 3, state: 'FAILED' });
  await expect(service.startReplacementAttempt(makeAcknowledgedReplacementInput()))
    .rejects.toMatchObject({ code: 'PUBLICATION_ATTEMPT_LIMIT_REACHED' });
});
```

- [ ] **RED 3.2 — Witness missing event service/routes.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/apply-publication-event.service.test.ts src/modules/youtube-publishing/delivery/http/youtube-publication.controller.test.ts
```

Expected RED: service/controller/internal-route shells collect; a `VIDEO_CREATED` event returns `501 NOT_IMPLEMENTED` and never calls `attachRemoteVideo` exactly once.

- [ ] **GREEN 3.3 — Implement state policy and internal endpoints.**

`ApplyPublicationEventService` validates current publication/attempt IDs, calls Task 2 `assertPublicationTransition` only for ordinary actual state changes, updates through application-owned persistence ports in a unit-of-work, attaches remote identity once, clamps progress monotonically, and copies only generated sanitized codes/messages. Progress/heartbeat events update the attempt and return the unchanged publication without asking the transition policy to accept a self-transition. `eventToPublicationState` is closed over worker events and cannot emit `READY_TO_UPLOAD`, `UPLOADING`, or `YOUTUBE_PROCESSING` from `UPLOAD_OUTCOME_UNCERTAIN`/`FAILED` recovery.

Recovery uses separate application methods, never `apply` or a generic state setter: `retryFailed` locks the publication and attempt, converts the durable fields to Task 2 `OrdinaryPreFinalRetryEvidence`, calls `assertOrdinaryPreFinalRetry`, then appends a bounded next attempt and sets `READY_TO_UPLOAD`; a non-null final-dispatch marker, outcome uncertainty, reconciliation, acknowledgement, or remote ID returns `FINAL_DISPATCH_RECOVERY_REQUIRED` without mutation. `startReplacementAttempt` locks the same rows, requires `UPLOAD_OUTCOME_UNCERTAIN`, builds `AcknowledgedReplacementEvidence` from persisted final-dispatch/outcome/reconciliation/acknowledgement fields, calls `assertAcknowledgedReplacementAttempt`, then appends the replacement and sets `READY_TO_UPLOAD`. It never accepts a caller-provided acknowledgement as evidence. Reconciliation with `VIDEO_FOUND` attaches the video identity first, calls `assertReconciledRemoteVideo`, and alone may set `YOUTUBE_PROCESSING`. Thus no HTTP/event/UI caller can reach a recovery state through Task 2's generic policy.

All checkpoint/event/attempt internal routes require Phase 1 worker authentication before closed DTO validation. Checkpoint GET exposes only attempt ID/number, opaque session reference, acknowledged/total bytes, video ID, final-chunk-dispatch timestamp, uncertainty timestamp, reconciliation result, duplicate-risk-acknowledged boolean, and cancel flag. Event POST accepts the generated event union. Attempts POST atomically appends a replacement and returns the generated checkpoint; after final dispatch it rejects unless reconciliation and duplicate-risk acknowledgement are already durable. Public start/cancel/retry/reconcile/duplicate-risk routes call one application service method and require explicit confirmation/idempotency.

```ts
async apply(input: PublicationProgressEventV1): Promise<PublicationEntityDto> {
  return this.unitOfWork.execute(async (transaction) => {
    const current = await transaction.publications.requireById(input.publicationId);
    const attempt = await transaction.publicationAttempts.requireById(input.attemptId);
    if (input.type === 'UPLOAD_PROGRESS') {
      await transaction.publicationAttempts.saveProgress({
        ...attempt,
        acknowledgedBytes: bigintMax(attempt.acknowledgedBytes, BigInt(input.acknowledgedBytes)),
      });
      return current;
    }
    if (input.type === 'UPLOAD_OUTCOME_UNCERTAIN') {
      await transaction.publicationAttempts.markOutcomeUncertain({
        attemptId: attempt.id,
        finalChunkDispatchedAt: new Date(input.finalChunkDispatchedAt),
        safeReasonCode: input.safeReasonCode,
      });
    }
    const nextState = eventToPublicationState(input);
    if (nextState === current.state) return current;
    assertPublicationTransition(current.state, nextState);
    return transaction.publications.updateState(current.id, nextState);
  });
}
```

```ts
async retryFailed(input: RetryFailedPublicationInput): Promise<PublicationEntityDto> {
  return this.unitOfWork.execute(async (transaction) => {
    const publication = await transaction.publications.requireByIdForUpdate(input.publicationId);
    const attempt = await transaction.publicationAttempts.requireCurrentForUpdate(publication.id);
    let authorization: { nextState: PublicationState.ReadyToUpload };
    try {
      authorization = assertOrdinaryPreFinalRetry(publication.state, {
        kind: 'PRE_FINAL_RETRY',
        finalChunkDispatchStartedAt: attempt.finalChunkDispatchStartedAt,
        outcomeUncertainAt: attempt.outcomeUncertainAt,
        reconciliationCheckedAt: attempt.reconciliationCheckedAt,
        reconciliationResult: attempt.reconciliationResult,
        duplicateRiskAcknowledgedAt: attempt.duplicateRiskAcknowledgedAt,
        youtubeVideoId: publication.youtubeVideoId,
        attemptNumber: attempt.attemptNumber,
        maxAttempts: 3,
      });
    } catch {
      throw new PublicationRecoveryError('FINAL_DISPATCH_RECOVERY_REQUIRED');
    }
    await transaction.publicationAttempts.insert(nextAttempt(publication, attempt, input));
    return transaction.publications.updateState(publication.id, authorization.nextState);
  });
}

async startReplacementAttempt(input: AcknowledgedReplacementInput): Promise<PublicationEntityDto> {
  return this.unitOfWork.execute(async (transaction) => {
    const publication = await transaction.publications.requireByIdForUpdate(input.publicationId);
    const attempt = await transaction.publicationAttempts.requireCurrentForUpdate(publication.id);
    const authorization = assertAcknowledgedReplacementAttempt(publication.state, {
      kind: 'ACKNOWLEDGED_REPLACEMENT',
      finalChunkDispatchStartedAt: requireValue(attempt.finalChunkDispatchStartedAt),
      outcomeUncertainAt: requireValue(attempt.outcomeUncertainAt),
      reconciliationCheckedAt: requireValue(attempt.reconciliationCheckedAt),
      reconciliationResult: requireValue(attempt.reconciliationResult),
      duplicateRiskAcknowledgedAt: attempt.duplicateRiskAcknowledgedAt,
      youtubeVideoId: publication.youtubeVideoId,
      attemptNumber: attempt.attemptNumber,
      maxAttempts: 3,
    });
    await transaction.publicationAttempts.insert(nextAttempt(publication, attempt, input));
    return transaction.publications.updateState(publication.id, authorization.nextState);
  });
}
```

`requireByIdForUpdate`/`requireCurrentForUpdate` are Entity-oriented application repository methods added to the Task 5 ports and implemented with `SELECT … FOR UPDATE`; they return Entity DTOs, never Prisma/Record values. `nextAttempt` copies only immutable publication intent and creates a new idempotency key. The request flag `duplicateRiskAcknowledged` is only a confirmation gate; it cannot replace the persisted acknowledgement timestamp passed to the pure policy.

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/apply-publication-event.service.test.ts src/modules/youtube-publishing/delivery/http/youtube-publication.controller.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Make callbacks retry-safe.**

Use Phase 1 `IdempotencyReceipt` keyed by workflow run/event sequence. Append:

```ts
it.each(['VIDEO_CREATED', 'SUCCEEDED', 'FAILED'] as const)(
  'applies duplicate %s event once',
  async (type) => {
    const event = makeEvent({ type, eventSequence: 7 });
    await service.apply(event);
    await service.apply(event);
    expect(unitOfWork.mutationCountFor(type)).toBe(1);
  },
);

it('creates one replacement attempt for a duplicate acknowledged request', async () => {
  const command = makeAcknowledgedReplacementCommand({ eventSequence: 8 });
  await service.startReplacementAttempt(command);
  await service.startReplacementAttempt(command);
  expect(attempts.insert).toHaveBeenCalledOnce();
});
```

Witness RED if duplicate delivery mutates twice, implement receipts, and rerun; expected GREEN is PASS.

## RED-GREEN-REFACTOR cycle 4: restart/offline schedule integration

- [ ] **RED 4.1 — Write full infrastructure integration first.**

`publication-workflow-restart.test.ts` starts disposable PostgreSQL/Redis/MinIO/Temporal, the native worker with fake YouTube, and internal Next.js test server. It uploads a synthetic 12 MiB MP4 fixture, kills/restarts the worker after 8 MiB, then asserts:

```ts
expect(fakeYouTube.createdVideoCount).toBe(1);
expect(await publications.findById(publicationId)).toMatchObject({
  state: 'SCHEDULED',
  youtubeVideoId: 'video-safe-1',
  youtubeUrl: 'https://youtu.be/video-safe-1',
});
expect(await attempts.listByPublication(publicationId)).toHaveLength(1);
expect((await attempts.listByPublication(publicationId))[0]).toMatchObject({
  acknowledgedBytes: 12_582_912n,
  progressPercent: 100,
});
```

Stop all Clip Factory services after fake YouTube accepts the schedule; advance fake provider time past `publishAt`; assert the fake video becomes public without a Clip Factory request. In the same suite, one sibling upload fails permanently while another reaches `PRIVATE_REVIEW`, and a thumbnail 403 keeps its upload successful.

Append this integration branch:

```ts
fakeYouTube.configureFinalResponseLoss({ reconciliation: 'INCONCLUSIVE' });
const uncertain = await harness.startPrivatePublication('clip-uncertain');
await expect.poll(() => publications.findById(uncertain.id)).toMatchObject({
  state: 'UPLOAD_OUTCOME_UNCERTAIN',
  youtubeVideoId: null,
});
const uncertainAttempt = (await attempts.listByPublication(uncertain.id))[0];
expect(uncertainAttempt.finalChunkDispatchStartedAt).not.toBeNull();
expect(uncertainAttempt.outcomeUncertainAt!.getTime()).toBeGreaterThanOrEqual(
  uncertainAttempt.finalChunkDispatchStartedAt!.getTime(),
);
expect(fakeYouTube.createdSessionCount).toBe(1);
await harness.restartWorker();
await harness.advanceTemporalBy('30m');
expect(fakeYouTube.createdSessionCount).toBe(1);
await expect(harness.requestReplacement(uncertain.id, { confirmed: true }))
  .rejects.toMatchObject({ code: 'UPLOAD_DUPLICATE_RISK_ACKNOWLEDGEMENT_REQUIRED' });
```

Then set reconciliation to `VIDEO_FOUND` and assert attachment without replacement. In a fresh run keep it `INCONCLUSIVE`, persist explicit acknowledgement, request replacement, and assert attempt 2/session 2 plus an audit timestamp.

- [ ] **RED 4.2 — Run and witness missing end-to-end orchestration.**

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publication-workflow-restart.test.ts
```

Expected RED: the lifecycle harness starts; after restart the fake records two created upload sessions instead of preserving the single resumable intent.

- [ ] **GREEN 4.3 — Complete composition and lifecycle harness.**

Register publication workflow/activities in the native worker, scheduler/checkpoint/event adapters in web/worker composition roots, and fake-provider endpoint overrides only in test configuration. Ensure the integration harness waits on state changes, not sleeps, and shuts down only processes it started.

```python
worker = Worker(
    temporal_client,
    task_queue=settings.youtube_publishing_task_queue,
    workflows=[YouTubePublicationWorkflow],
    activities=[
        create_upload_session,
        probe_upload_session,
        mark_final_chunk_dispatch,
        upload_chunk,
        reconcile_channel,
        poll_processing,
        set_thumbnail,
        report_publication_event,
    ],
)
```

```ts
youtubePublishingModule.register({
  scheduler: new TemporalPublicationWorkflowScheduler(temporalClient),
  checkpointClient: new InternalPublicationCheckpointClient(workerHttpClient),
  eventService: new ApplyPublicationEventService(publicationDependencies),
});
```

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publication-workflow-restart.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.4 — Prove three independent schedules.**

Append this schedule assertion:

```ts
const scheduled = await harness.publishThree({
  tokyo: ['2026-08-01T09:30:00', 'Asia/Tokyo'],
  newYork: ['2026-08-01T09:30:00', 'America/New_York'],
  utc: ['2026-08-01T09:30:00', 'UTC'],
});
expect(new Set(scheduled.map((item) => item.workflowId)).size).toBe(3);
expect(scheduled.map((item) => item.sourceTimezone)).toEqual([
  'Asia/Tokyo', 'America/New_York', 'UTC',
]);
expect(new Set(scheduled.map((item) => item.scheduleAtUtc.toISOString())).size).toBe(3);
expect(fakeYouTube.publishAtValues()).toEqual(
  scheduled.map((item) => item.scheduleAtUtc.toISOString()),
);
```

Rerun the integration file; expected GREEN is PASS with independent terminal results.

## Broader verification

- [ ] Run:

```bash
pnpm test:contracts
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/start-youtube-publication.service.test.ts src/modules/youtube-publishing/application/services/apply-publication-event.service.test.ts src/modules/youtube-publishing/delivery/http/youtube-publication.controller.test.ts
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py -q
pnpm exec vitest run tests/integration/youtube-publishing/publication-workflow-restart.test.ts
pnpm test:integration
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm workflow histories contain connection/publication/attempt IDs, object references, snapshot, session reference, offsets, final-dispatch/uncertainty/reconciliation state, and sanitized events only—no token, code, verifier, client secret, media bytes, provider SDK object, or raw error body.

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py -q -k 'history and sanitized'
```

- [ ] Confirm cancellation after video ID stops polling but never invokes remote delete.

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_publication_workflow.py -q -k 'cancel and video_id'
```

- [ ] Confirm worker/app shutdown after accepted schedule does not change YouTube-owned publication.

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publication-workflow-restart.test.ts -t 'accepted schedule survives worker and app shutdown'
```

## Review gate

Approve only when pre-final restart resumes safely, progress is monotonic, pre-final expired sessions append bounded attempts, lost final outcome pauses without automatic replacement, channel reconciliation and duplicate-risk acknowledgement are enforced, reauth pauses/resumes, cancellation obeys remote-ID semantics, thumbnail warning preserves success, schedules survive offline, and sibling workflows remain independent. Do not approve any claim of provider-level exactly-once when the final video ID is unknown.

## Suggested commit

```text
feat(youtube): orchestrate resumable publication workflows
```
