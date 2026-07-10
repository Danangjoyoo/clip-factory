# Task 32: Real Infrastructure and Contract Integration Suite

> **For agentic workers:** Use superpowers:test-driven-development. Run against disposable Compose state; no developer database or bucket may be reused.

## Purpose and traceability

Implement design §27 integration coverage for PostgreSQL, Redis, MinIO, Temporal, migrations, internal callbacks, contracts, and multipart lifecycle.

## Boundaries and files

- Requires Tasks 4–17 and 31.
- Create: `infra/compose/docker-compose.test.yml`
- Create: `tests/integration/setup/global-setup.ts`
- Create: `tests/integration/setup/global-teardown.ts`
- Create: `tests/integration/setup/wait-for-services.ts`
- Create: `tests/integration/support/postgres.ts`
- Create: `tests/integration/support/redis.ts`
- Create: `tests/integration/support/minio.ts`
- Create: `tests/integration/support/temporal.ts`
- Create: `tests/integration/support/test-environment.ts`
- Test: `tests/integration/infrastructure-health.test.ts`
- Test: `tests/integration/database/migration-history.test.ts`
- Test: `tests/integration/database/repository-roundtrip.test.ts`
- Test: `tests/integration/storage/multipart-upload.test.ts`
- Test: `tests/integration/storage/object-lifecycle.test.ts`
- Test: `tests/integration/workflows/temporal-signals.test.ts`
- Test: `tests/integration/jobs/progress-sse.test.ts`
- Test: `tests/integration/jobs/internal-callback.test.ts`
- Test: `tests/integration/recovery/paid-call-reconciliation.test.ts`
- Test services bind random/CI-only ports and volumes use a unique Compose project name `clip-factory-test-${GITHUB_RUN_ID:-local}`.

## RED → GREEN → REFACTOR

- [ ] **RED: write infrastructure health test before test Compose overlay.**

```ts
it('starts fresh disposable infrastructure with an empty product schema', async () => {
  expect(await postgres.query("select to_regclass('public.projects') as table_name")).toEqual({ rows:[{table_name:null}] });
  expect(await redis.dbsize()).toBe(0);
  expect(await minio.bucketExists('clip-factory-test')).toBe(true);
  expect(await temporal.workflowService.getSystemInfo({})).toBeDefined();
});
```

- [ ] Run `pnpm test:integration -- infrastructure-health.test.ts`; expect connection/setup FAIL.

- [ ] **GREEN:** test overlay sets ephemeral PostgreSQL database, Redis no persistence, MinIO `clip-factory-test` bucket, Temporal namespace `clip-factory-test`, fake web/worker credentials, CPU/fake model adapters, and no host production volumes. Global setup uses `docker compose -p <unique> up -d --wait`; teardown uses `down -v --remove-orphans` in `finally`.

- [ ] Run health test; expect PASS.

- [ ] **RED: migration history test.** Apply `prisma migrate deploy` to empty DB, assert all Task 6 tables/checks/indexes, reapply no-op, insert invalid checks, then migrate a second independently created DB and compare normalized schema dump hashes.

- [ ] **GREEN:** integration helper invokes pinned Prisma CLI with test `DATABASE_URL`, captures `_prisma_migrations`, and normalizes owner/ACL lines before SHA-256 comparison. No `migrate dev` runs in suite.

- [ ] **RED/GREEN vertical tests:** multipart part-1/resume/complete/head/delete; internal result duplicate/conflict; Redis loss/rebuild/SSE Last-Event-ID; Temporal wait/signal/replay; callback object-reference rejection; repository converter round trips; uncertain paid-call recorded-artifact reconciliation and confirmed-absence waiting.

- [ ] **REFACTOR:** use unique UUID/key prefixes per test, deterministic clocks/fakes, condition-based waits capped 30 seconds, and artifact capture only on failure. Assert cleanup leaves zero test objects/keys/workflows.

## Verification and commit

```bash
pnpm compose:config
pnpm test:contracts
pnpm test:integration
docker compose -p clip-factory-test-local -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.test.yml ps --all
git diff --check
```

Expected: all real infrastructure interactions pass from empty state and teardown removes test volumes/networks.

**Suggested commit:** `test: add real infrastructure integration suite`
