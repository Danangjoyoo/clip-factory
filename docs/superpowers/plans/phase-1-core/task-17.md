# Task 17: Measured Progress, ETA Ranges, Redis Projection, and SSE

> **For agentic workers:** Use superpowers:test-driven-development. Redis is rebuildable; terminal state is persisted before it is published.

## Purpose and traceability

Implement design §§21–22 and 28: activity heartbeats, measured work percentages, historical range estimates, queue ranges, Redis fan-out, reconnectable SSE, and durable timing observations.

## Boundaries and files

- Requires Tasks 8, 13, and 16.
- Create: `apps/web/src/modules/jobs/domain/progress.ts`
- Create: `apps/web/src/modules/jobs/application/ports/live-projection.port.ts`
- Create: `apps/web/src/modules/jobs/application/ports/stage-timing-observation.repository.ts`
- Create: `apps/web/src/modules/jobs/application/data-services/stage-timing-observation.data-service.ts`
- Create: `apps/web/src/modules/jobs/application/services/record-progress.service.ts`
- Create: `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.ts`
- Create: `apps/web/src/modules/jobs/adapters/clients/redis/redis-live-projection.adapter.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/dto/record/stage-timing-observation-record.dto.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/repositories/prisma-stage-timing-observation.repository.ts`
- Create: `apps/web/src/modules/jobs/delivery/http/dto/api/progress-event-api.dto.ts`
- Create: `apps/web/src/modules/jobs/delivery/http/progress-sse.controller.ts`
- Create: `apps/web/src/modules/jobs/converters/api-entity/progress-event.converter.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/converters/stage-timing-observation.converter.ts`
- Create: `apps/web/src/app/api/projects/[projectId]/events/route.ts`
- Test: `apps/web/src/modules/jobs/domain/progress.test.ts`
- Test: `apps/web/src/modules/jobs/application/services/record-progress.service.test.ts`
- Test: `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.test.ts`
- Test: `apps/web/src/modules/jobs/adapters/clients/redis/redis-live-projection.adapter.test.ts`
- Test: `apps/web/src/modules/jobs/delivery/http/progress-sse.controller.test.ts`
- Test: `tests/integration/jobs/progress-sse.test.ts`
- Create: `apps/worker/src/clip_factory/domain/progress.py`
- Create: `apps/worker/src/clip_factory/ports/progress.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/progress_heartbeat.py`
- Test: `apps/worker/tests/domain/test_progress.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_progress_heartbeat.py`
- Modify: `apps/web/package.json`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Modify: `pnpm-lock.yaml`
- Pin Node `redis` to `6.1.0` and Python `redis==8.0.1` without ranges.
- Redis Client types stay in adapter; UI receives `ProgressPresentation` only.

## RED → GREEN → REFACTOR

- [ ] **RED: exact percent and waiting behavior.**

```ts
it.each([
  [{ completed: 0n, total: 100n }, 0],
  [{ completed: 1n, total: 3n }, 3333],
  [{ completed: 100n, total: 100n }, 10000],
])('calculates measured basis points', ({ completed, total }, expected) => expect(progressBasisPoints(completed, total)).toBe(expected));
it.each(['AWAITING_BUDGET', 'PAID_CALL_UNCERTAIN', 'AWAITING_REVIEW'])('suppresses ETA for %s', (state) => expect(estimateEta({ state, completed: 10n, total: 100n, elapsedSeconds: 5, historicalThroughputs: [2] })).toEqual({ lowSeconds: null, highSeconds: null, confidence: 'NOT_APPLICABLE' }));
```

- [ ] Create the declared progress exports with `calculateProgress` returning zero progress and null ETA, verify typecheck passes, then run the test; expect the named weighted-progress assertion to FAIL with `0`.

- [ ] **GREEN: create exact formulas.**

```ts
export function progressBasisPoints(completed: bigint, total: bigint): number {
  if (completed < 0n || total <= 0n || completed > total) throw new ProgressError('INVALID_WORK_UNITS');
  return Number((completed * 10000n) / total);
}
export function estimateEta(input: EtaInput): EtaRange {
  if (input.state === 'AWAITING_BUDGET' || input.state === 'PAID_CALL_UNCERTAIN' || input.state === 'AWAITING_REVIEW') return { lowSeconds: null, highSeconds: null, confidence: 'NOT_APPLICABLE' };
  const remaining = Number(input.total - input.completed);
  const current = input.completed > 0n ? Number(input.completed) / input.elapsedSeconds : 0;
  const rates = input.historicalThroughputs.filter((rate) => rate > 0).sort((a, b) => a - b);
  if (rates.length < 5) {
    if (current <= 0) return { lowSeconds: null, highSeconds: null, confidence: 'LOW' };
    const center = remaining / current;
    return { lowSeconds: Math.ceil(center * 0.8), highSeconds: Math.ceil(center * 1.5), confidence: 'LOW' };
  }
  const p25 = rates[Math.floor((rates.length - 1) * 0.25)]!;
  const p75 = rates[Math.floor((rates.length - 1) * 0.75)]!;
  return { lowSeconds: Math.ceil(remaining / p75), highSeconds: Math.ceil(remaining / p25), confidence: rates.length >= 20 ? 'HIGH' : 'MEDIUM' };
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/jobs/domain/progress.test.ts apps/web/src/modules/jobs/domain/eta.test.ts`; expect PASS. Add exact tests for invalid work, first-run no progress, OpenAI-stage widened 0.7×–2× range, multi-item weighted progress, and queued range equal to active high range plus preceding queue medians.

- [ ] **RED: test durable-before-live ordering and reconnect.** Harness records calls; assert `JobProjectionDataService.upsert` then `StageTimingDataService.create` on terminal then Redis `publish`. SSE with `Last-Event-ID: 41` receives events 42 onward and a 15-second keepalive comment.

- [ ] **GREEN:** `RecordProgressService` validates contract→Entity, calculates basis points/ETA, persists projection, persists terminal timing, then calls `LiveProjectionPort.publish`. Redis stores `progress:<projectId>` JSON with 24-hour TTL and appends max 1000 events to `progress-events:<projectId>` stream. SSE uses `XREAD` from supplied ID and abort signal cleanup.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/jobs/application/services/record-progress.service.test.ts apps/web/src/modules/jobs/adapters/redis apps/web/src/modules/jobs/delivery/http/progress-sse.controller.test.ts`; expect PASS.

- [ ] **RED/GREEN rebuild:** empty Redis plus durable active projections repopulates snapshots on web startup; terminal states never regress from an older heartbeat; worker heartbeat older than 30 seconds projects `WORKER_OFFLINE` without failing job.

- [ ] **REFACTOR:** Python `ProgressReporter.report(completed,total,unit)` validates raw units and calls `activity.heartbeat(progress_contract)` only in Temporal adapter. Add path/transcript redaction assertion for serialized events.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/jobs
uv run --directory apps/worker pytest tests/domain/test_progress.py tests/entrypoints/temporal/test_progress_heartbeat.py -q
pnpm exec vitest run tests/integration/jobs/progress-sse.test.ts
pnpm test:architecture
git diff --check
```

Expected: percentages derive from measured units, waiting states have no ETA, ranges are labeled, and Redis loss is recoverable.

**Suggested commit:** `feat: add measured progress and eta streams`
