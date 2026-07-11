# Task 32: Real Infrastructure and Contract Integration Suite

> **For agentic workers:** Use superpowers:test-driven-development. Run against disposable Compose state; no developer database or bucket may be reused.

## Purpose and traceability

Implement design §27 integration coverage for PostgreSQL, Redis, MinIO, Temporal, migrations, internal callbacks, contracts, and multipart lifecycle.

## Boundaries and files

- Requires Tasks 4–17 and 31.
- Reuse/complete: `infra/compose/docker-compose.ci.yml`
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

- [ ] First create `docker-compose.ci.yml` and setup/support shells, start the real Task 4 services with `docker compose -p clip-factory-test-local -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.ci.yml up -d --wait`, and verify the test collects. Run `pnpm test:integration -- infrastructure-health.test.ts`; expect the named empty-product-schema assertion to FAIL because the shell setup deliberately creates a sentinel `projects` table; connection/setup failures are not accepted.

- [ ] **GREEN:** implement the real-service overlay in `infra/compose/docker-compose.ci.yml`, `globalSetup` in `tests/integration/setup/global-setup.ts`, and `globalTeardown` in `tests/integration/setup/global-teardown.ts`: overlay Task 4's named services with ephemeral DB/no Redis persistence/test bucket+namespace/fake credentials, run exact Compose `up -d --wait`, initialize bucket/namespace, then spawn and capture `uv run --directory apps/worker clip-factory-worker --adapter fake`; teardown must await worker termination and matching `down -v --remove-orphans` in `finally`. Run `pnpm test:integration -- infrastructure-health.test.ts`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm compose:config
# Expected: PASS
```

- [ ] Run `pnpm test:integration -- infrastructure-health.test.ts`; expect PASS.

- [ ] **RED: migration history test.** Apply `prisma migrate deploy` to empty DB, assert all Task 6 tables/checks/indexes, reapply no-op, insert invalid checks, then migrate a second independently created DB and compare normalized schema dump hashes.

- [ ] **GREEN:** implement `applyMigrations(databaseUrl)` and `normalizedSchemaHash(databaseUrl)` in `tests/integration/support/postgres.ts` to invoke pinned Prisma CLI against only test `DATABASE_URL`, capture `_prisma_migrations`, and normalize owner/ACL lines before SHA-256 comparison; forbid `migrate dev`. Run `pnpm test:integration -- migration-history.test.ts`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm compose:config
# Expected: PASS
```

- [ ] **RED:** add the listed vertical tests under `tests/integration/storage`, `jobs`, `workflows`, `recovery`, and `database`; run `pnpm test:integration`; expect each first named behavioral assertion to FAIL against compile-safe fake clients while setup remains healthy.

- [ ] **GREEN:** replace only those fake clients with the Task 4 Compose clients in `support/{postgres,redis,minio,temporal}.ts`; implement multipart/resume/complete/head/delete, result duplicate/conflict, Redis rebuild/SSE, Temporal wait/signal/replay, callback object-reference rejection, repository round trips, and uncertain-call reconciliation. Run `pnpm test:integration`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm compose:config
# Expected: PASS
```

- [ ] **REFACTOR:** centralize UUID/key prefix creation and 30-second condition waits in `tests/integration/support/test-environment.ts`, inject deterministic clocks/fakes, retain artifacts only on failure, and assert zero test objects/keys/workflows after cleanup. Re-run `pnpm test:integration && pnpm test:architecture`; expect PASS.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm compose:config
# Expected: PASS
```

## Verification and commit

```bash
pnpm compose:config
pnpm test:contracts
pnpm test:integration
docker compose -p clip-factory-test-local -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.ci.yml ps --all
git diff --check
```

Expected: all real infrastructure interactions pass from empty state and teardown removes test volumes/networks.

**Suggested commit:** `test: add real infrastructure integration suite`
