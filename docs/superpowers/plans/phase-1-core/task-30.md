# Task 30: Settings, Health, Structured Logs, Metrics, and Redacted Diagnostics

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. No telemetry leaves the machine.

## Purpose and traceability

Implement Settings and observability from design §§17, 24, and 28: allowed roots, model cache/health, defaults/catalog status, complete service health, local structured metrics, and user-triggered redacted diagnostics.

## Boundaries and files

- Requires Tasks 3–4, 10, 12, 17, and 24.
- Create: `apps/web/src/app/settings/page.tsx`
- Create: `apps/web/src/modules/settings/domain/redaction.ts`
- Create: `apps/web/src/modules/settings/application/dto/entity/settings-entity.dto.ts`
- Create: `apps/web/src/modules/settings/application/dto/entity/health-entity.dto.ts`
- Create: `apps/web/src/modules/settings/application/ports/settings-store.port.ts`
- Create: `apps/web/src/modules/settings/application/ports/health-check.port.ts`
- Create: `apps/web/src/modules/settings/application/ports/diagnostics-archive.port.ts`
- Create: `apps/web/src/modules/settings/application/ports/local-metrics.port.ts`
- Create: `apps/web/src/modules/settings/application/services/get-health.service.ts`
- Create: `apps/web/src/modules/settings/application/services/update-settings.service.ts`
- Create: `apps/web/src/modules/settings/application/services/export-diagnostics.service.ts`
- Create: `apps/web/src/modules/settings/adapters/filesystem/local-settings-store.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/health/postgres-health.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/health/redis-health.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/health/minio-health.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/health/temporal-health.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/health/worker-health.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/diagnostics/zip-diagnostics-archive.adapter.ts`
- Create: `apps/web/src/modules/settings/adapters/metrics/local-metrics.adapter.ts`
- Create: `apps/web/src/modules/settings/delivery/http/dto/api/settings-api.dto.ts`
- Create: `apps/web/src/modules/settings/delivery/http/settings.controller.ts`
- Create: `apps/web/src/modules/settings/delivery/ui/SettingsView.tsx`
- Create: `apps/web/src/modules/settings/delivery/ui/SettingsView.module.css`
- Create: `apps/web/src/modules/settings/composition/settings.composition.ts`
- Create: `apps/web/src/app/api/settings/route.ts`
- Create: `apps/web/src/app/api/health/route.ts`
- Create: `apps/web/src/app/api/diagnostics/route.ts`
- Create: `apps/worker/src/clip_factory/domain/redaction.py`
- Create: `apps/worker/src/clip_factory/application/health.py`
- Test: `apps/web/src/modules/settings/domain/redaction.test.ts`
- Test: `apps/web/src/modules/settings/application/services/get-health.service.test.ts`
- Test: `apps/web/src/modules/settings/application/services/update-settings.service.test.ts`
- Test: `apps/web/src/modules/settings/application/services/export-diagnostics.service.test.ts`
- Test: `apps/web/src/modules/settings/delivery/ui/SettingsView.test.tsx`
- Test: `apps/worker/tests/domain/test_redaction.py`
- Test: `apps/worker/tests/application/test_health.py`
- Test: `tests/integration/observability/diagnostics.test.ts`
- Settings routes call one service; UI receives no secret/path beyond user-edited allowed roots.

## RED → GREEN → REFACTOR

- [ ] **RED: redaction property/table tests.** Inputs containing `sk-proj-secret`, bearer token, `/Users/me/private.mov`, transcript sentence, MinIO secret, OAuth token keys, and nested variants must produce `[REDACTED_SECRET]`, `[REDACTED_PATH]`, or `[REDACTED_TEXT]`; safe IDs/stage/timing/model remain.

- [ ] Run `pnpm exec vitest run apps/web/src/modules/settings/domain/redaction.test.ts` and Python redaction test; expect import FAIL.

- [ ] **GREEN: create allowlist-based structured fields.**

```ts
const SAFE_KEYS = new Set(['timestamp','level','event','projectId','workflowId','activityId','clipId','renderId','errorCode','stage','durationMs','retryCount','modelId','tokenCount','costMicrousd','queueDelayMs']);
export function redactDiagnosticRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => SAFE_KEYS.has(key)).map(([key,value]) => [key, typeof value === 'string' && /(?:sk-[A-Za-z0-9_-]+|Bearer\s+\S+|\/Users\/[^\s]+)/u.test(value) ? '[REDACTED]' : value]));
}
```

- [ ] Run redaction tests; expect PASS. Python uses identical safe-key fixture from `packages/contracts/test-fixtures/redaction-cases.json`.

- [ ] **RED: health aggregation.** Test statuses for Next.js, PostgreSQL, Redis, MinIO, Temporal, worker heartbeat, FFmpeg, the exact Task 12 transcriber revision/hash, OpenAI configuration presence, and sanitized per-allowlisted-model access from Task 15; one failure yields `DEGRADED`, not secret detail; heartbeat >30 seconds is offline. A missing key reports access `UNKNOWN`, 403/404 reports only `NOT_ENTITLED`/`NOT_FOUND`, and no health check performs inference.

- [ ] **GREEN:** application `GetHealthService` concurrently invokes narrow health ports with 2-second deadlines, maps to `{component,status,checkedAt,message}`, and derives overall. Next.js never receives the OpenAI key and never constructs an OpenAI client: `worker-health.adapter.ts` reads the closed Task 5 heartbeat projection containing `openAiConfigured`, per-model sanitized access status, and the Task 12 cache revision/hash/status. The native Task 15 adapter refreshes access with `models.retrieve` on explicit Retry and at a bounded 15-minute TTL, never through a Responses inference call and never with silent fallback.

- [ ] **RED: settings UI.** Root add/remove validates absolute/nonoverlapping paths after worker check; cache actions show size/model/revision and require confirmation; default platform/caption profile and catalog versions/status render; health status has text/icon, focus, retry.

- [ ] **GREEN:** create controlled Settings sections and API services. Persist nonsecret settings through local config file adapter with atomic temp+rename and mode 0600; API key remains environment-only and never rendered or persisted.

- [ ] **RED/GREEN diagnostics:** user click creates ZIP containing redacted JSON logs, metrics, health, versions, probes without media/transcript/raw path/secrets. Before download, scan archive bytes against secret/path/transcript fixtures and abort with `DIAGNOSTICS_REDACTION_FAILED` on match.

- [ ] **REFACTOR:** local metrics include stage duration, real-time factor, ETA error, retries, token/cost, render success, queue delay; no exporter/network endpoint exists. Diagnostics have generated project-safe key and 24-hour cleanup.

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/settings
uv run --directory apps/worker pytest tests/domain/test_redaction.py tests/application/test_health.py -q
pnpm exec vitest run tests/integration/observability/diagnostics.test.ts
pnpm test:architecture
git diff --check
```

Expected: complete local health/settings work, diagnostics are safe, and observability performs no outbound telemetry.

**Suggested commit:** `feat: add local settings health and diagnostics`
