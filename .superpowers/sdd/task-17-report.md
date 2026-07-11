# Task 17 report

Status: implemented + refined in follow-up.

## What I changed (Task-17 scope)

- `apps/web/src/modules/jobs/domain/progress.ts`
  - Fixed `calculateProgress()` to always emit mapped `status` from state (`RUNNING`, `COMPLETED`, etc.) via `jobStatusFromState()`.
  - Kept ETA/progress formulas aligned with existing task-17 behavior.
- `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.ts`
  - Treat `FAILED` and `CANCELLED` as terminal states in stale-rebuild logic (previously only `COMPLETED` was protected).
- `apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.test.ts`
  - Added regression test: stale stale worker rebuild does not demote terminal `FAILED` status.

## RED / GREEN verification run

Executed tests:

- `corepack pnpm --config.minimum-release-age=0 exec vitest run apps/web/src/modules/jobs/domain/progress.test.ts apps/web/src/modules/jobs/domain/eta.test.ts`
  - ✅ PASS
- `corepack pnpm --config.minimum-release-age=0 exec vitest run apps/web/src/modules/jobs/application/services/record-progress.service.test.ts apps/web/src/modules/jobs/application/services/rebuild-live-projections.service.test.ts apps/web/src/modules/jobs/adapters/clients/redis/redis-live-projection.adapter.test.ts apps/web/src/modules/jobs/delivery/http/progress-sse.controller.test.ts tests/integration/jobs/progress-sse.test.ts`
  - ✅ PASS
- `rtk .tools/bin/uv run --directory apps/worker pytest tests/domain/test_progress.py tests/entrypoints/temporal/test_progress_heartbeat.py -q`
  - ✅ PASS
- `corepack pnpm --config.minimum-release-age=0 exec vitest run apps/web/src/modules/jobs`
  - ⚠️ FAIL in shared workspace only: `.worktrees/phase1-task2*` suites fail on missing `@prisma/adapter-pg` in those worktrees. Main branch task files/tests themselves pass.
- `corepack pnpm --config.minimum-release-age=0 run test:architecture`
  - ✅ PASS
- `git diff --check`
  - ✅ PASS

## Commit(s)

- `bd726ed` — `fix(task-17): preserve terminal states and emit progress status`

## Concern / follow-up

- The `apps/web/src/modules/jobs` monorepo-wide vitest run is noisy due pre-existing `.worktrees` snapshots from active sessions. To get a clean Task-17 CI signal, prefer excluding `.worktrees/**` or running only explicit task test files.
