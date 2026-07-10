# Task 31: Recovery, Cancellation, Cleanup, and Restart Reconciliation

> **For agentic workers:** Use superpowers:systematic-debugging and superpowers:test-driven-development. Every recovery branch begins with a reproducing failure test.

## Purpose and traceability

Integrate design §23 and acceptance criteria 9, 10, and 14: bounded safe retries, conservative paid-call ambiguity, cancellation, artifact reuse, idempotent cleanup, Redis rebuild, and worker-offline queueing.

## Boundaries and files

- Requires Tasks 9–23.
- Create: `apps/worker/src/clip_factory/domain/retry.py`
- Create: `apps/worker/src/clip_factory/application/cancel_job.py`
- Create: `apps/worker/src/clip_factory/application/cleanup_job.py`
- Create: `apps/worker/src/clip_factory/application/reconcile_job.py`
- Create: `apps/worker/src/clip_factory/ports/cleanup_store.py`
- Create: `apps/worker/src/clip_factory/ports/recovery_state.py`
- Create: `apps/worker/src/clip_factory/adapters/storage/minio_cleanup_store.py`
- Create: `apps/worker/src/clip_factory/adapters/http/recovery_state_adapter.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/recovery_activities.py`
- Test: `apps/worker/tests/domain/test_retry.py`
- Test: `apps/worker/tests/application/test_cancel_job.py`
- Test: `apps/worker/tests/application/test_cleanup_job.py`
- Test: `apps/worker/tests/application/test_reconcile_job.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_restart_recovery.py`
- Create: `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.ts`
- Create: `apps/web/src/modules/jobs/application/services/reconcile-workflow.service.ts`
- Create: `apps/web/src/modules/jobs/application/services/cleanup-project.service.ts`
- Create: `apps/web/src/modules/jobs/adapters/clients/temporal/temporal-recovery.adapter.ts`
- Create: `apps/web/src/modules/jobs/adapters/clients/redis/redis-rebuild.adapter.ts`
- Create: `apps/web/src/infrastructure/startup/reconcile-jobs.ts`
- Test: `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.test.ts`
- Test: `apps/web/src/modules/jobs/application/services/reconcile-workflow.service.test.ts`
- Test: `apps/web/src/modules/jobs/application/services/cleanup-project.service.test.ts`
- Test: `apps/web/src/infrastructure/startup/reconcile-jobs.test.ts`
- Test: `tests/integration/recovery/compose-restart.test.ts`
- Test: `tests/integration/recovery/worker-restart.test.ts`
- Test: `tests/integration/recovery/project-deletion.test.ts`
- No cleanup operation accepts arbitrary key/path; it consumes project-scoped recorded references.

## RED → GREEN → REFACTOR

- [ ] **RED: exact retry classification table and replay.** MinIO/Redis/Temporal/internal HTTP/process I/O transient errors retry from bases 1/2/4/8 seconds with max five attempts and ±20% deterministic workflow jitter; malformed source/path/spec/credential-confirmed/invalid provider schema are nonretryable. OpenAI post-send ambiguity is never in retryable set. Capture/replay history and assert identical timers.

- [ ] Run Python/TS retry tests; expect import FAIL.

- [ ] **GREEN: use single-attempt activities and deterministic workflow timers, not an unsupported RetryPolicy jitter option.**

```python
class ActivityCallable(Protocol[T]):
    def __call__(self, argument: object) -> Awaitable[T]:
        raise NotImplementedError

async def execute_retryable(activity: ActivityCallable[T], argument: object, decision: RetryDecision) -> T:
    for attempt in range(1, decision.max_attempts + 1):
        try:
            return await workflow.execute_activity(activity, argument, start_to_close_timeout=decision.timeout, retry_policy=RetryPolicy(maximum_attempts=1))
        except ApplicationError as error:
            if not decision.retryable or attempt == decision.max_attempts or error.type in decision.non_retryable_types:
                raise
            base_ms = min(decision.initial_ms * (2 ** (attempt - 1)), decision.maximum_ms)
            jitter_micros = workflow.random().randint(800_000, 1_200_000)
            delay_ms = (base_ms * jitter_micros) // 1_000_000
            await workflow.sleep(timedelta(milliseconds=delay_ms))
    raise RuntimeError("retry loop exhausted without result or exception")
```

`RetryDecision` is exactly `(retryable,maxAttempts=5,initialMs=1000,maximumMs=30000,timeout,nonRetryableTypes)`. `OPENAI_PRE_SEND_FAILURE` may consume a remaining planned attempt under the existing reservation; `OPENAI_OUTCOME_UNCERTAIN` is excluded and returns waiting action `AUTHORIZE_FRESH_RESERVATION`.

- [ ] **RED: subprocess cancellation escalation.** Fake child receives SIGTERM once, exits before 10 seconds and no SIGKILL; stubborn child receives SIGTERM then SIGKILL at exactly 10 seconds; temp files and incomplete multipart keys clean once.

- [ ] **GREEN: create cancellation core.**

```python
async def terminate_process_group(process: ProcessHandle, clock: ClockPort) -> None:
    if process.returncode is not None:
        return
    process.send_signal(signal.SIGTERM)
    try:
        await clock.wait_for(process.wait(), timeout_seconds=10)
    except TimeoutError:
        process.send_signal(signal.SIGKILL)
        await process.wait()
```

`CleanupJob` aborts recorded multipart upload IDs, deletes only `projects/<projectId>/tmp/` objects and database-recorded incomplete artifact keys, and preserves completed artifacts unless explicit project deletion requested.

- [ ] **RED: restart matrix.** Tests cover Compose restart, web restart with empty Redis, worker restart after completed transcript, worker heartbeat loss, completed render reuse, failed sibling retry, missing source, and both paid-call crash windows.

```python
async def test_ambiguous_paid_call_never_auto_retries_after_worker_restart() -> None:
    h = await uncertain_call_harness(response_artifact=False, callback_record=False)
    await h.restart_worker()
    await h.advance(minutes=30)
    assert await h.state() == "PAID_CALL_UNCERTAIN"
    assert h.provider_call_count == 1
    await h.signal_retry(acknowledge_possible_prior_spend=True)
    assert h.fresh_reservation_count == 1
    assert h.provider_call_count == 2
```

- [ ] **GREEN:** `ReconcileJob` reads PostgreSQL terminal/intermediate references, Temporal description/history, and MinIO heads; it reuses verified artifacts, rebuilds Redis, and never schedules completed activity output. For uncertain calls it runs Task 15 reconciliation first; recorded artifact/callback resumes with one call, confirmed absence stays waiting until acknowledged/freshly reserved.

- [ ] **RED/GREEN project deletion:** cancel live project workflow, await bounded cancellation, remove DB/MinIO artifacts transactionally with retry ledger, never pass local filepath to delete, and make repeated deletion return 204. Inject failure after MinIO batch and prove retry completes.

- [ ] **REFACTOR:** worker heartbeat >30 seconds maps `WORKER_OFFLINE`, jobs remain queued, recovery logs use IDs/codes only, and cleanup/reconciliation are idempotent under duplicate Temporal delivery.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_retry.py tests/application/test_cancel_job.py tests/application/test_cleanup_job.py tests/entrypoints/temporal/test_restart_recovery.py -q
pnpm exec vitest run apps/web/src/modules/jobs/application/services
pnpm exec vitest run tests/integration/recovery
pnpm test:architecture
git diff --check
```

Expected: safe work retries boundedly, completed work is reused, ambiguous paid calls pause, and local sources can never be deleted.

**Suggested commit:** `feat: add durable recovery and cleanup`
