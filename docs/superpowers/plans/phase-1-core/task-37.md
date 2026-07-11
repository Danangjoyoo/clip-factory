# Task 37: Final Apple Silicon Acceptance and Evidence Bundle

> **For agentic workers:** Use superpowers:verification-before-completion. Do not declare Phase 1 accepted from CI alone; native MLX/VideoToolbox and the qualitative sample require recorded Apple Silicon evidence.

## Purpose and traceability

Execute and preserve evidence for all fourteen design §29 acceptance criteria, including a 30–60 minute sample, qualitative three-clip review, 3-hour/10-GB support, privacy, measured progress, restart deduplication, both sources/presets/delete/relink, CI, architecture, and ambiguous paid-call authorization.

## Layers and owned boundaries

- Acceptance owns no product policy or persistence. It drives public delivery APIs/UI, observes application outcomes, and reads redacted adapter/contract evidence.
- The runner depends on stable API Schema DTOs and versioned contracts only; it never imports Entity/Record/Client DTOs or provider SDKs.
- Native-only MLX and VideoToolbox evidence complements, but does not replace, unit, boundary, adapter, integration, and browser tests.

## Exact files and prerequisites

- Requires Tasks 1–36 green.
- Create: `tests/fixtures/acceptance/manifest.json`
- Create: `scripts/acceptance/preflight.mjs`
- Create: `scripts/acceptance/run-phase-1.mjs`
- Create: `scripts/acceptance/privacy-audit.mjs`
- Create: `docs/acceptance/phase-1-checklist.md`
- Create: `tests/acceptance/evidence-schema.test.mjs`
- Modify: `package.json`

No acceptance media is committed. Environment variables `CLIP_FACTORY_ACCEPTANCE_SAMPLE` and `CLIP_FACTORY_ACCEPTANCE_MAX_SOURCE` point to user-owned local files; the script validates but never copies/deletes them.

## RED → GREEN → REFACTOR

- [ ] **RED: evidence schema before runner.**

```js
test('acceptance bundle covers every numbered criterion without sensitive content', async () => {
  const evidence = JSON.parse(await readFile('.artifacts/acceptance/latest/evidence.json','utf8'));
  assert.deepEqual(evidence.criteria.map((item) => item.id), Array.from({length:14}, (_,index) => index + 1));
  assert.equal(evidence.criteria.every((item) => ['PASS','MANUAL_PASS'].includes(item.status)), true);
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /OPENAI_API_KEY|sk-[A-Za-z0-9_-]+|\/Users\/|transcriptText|rawMedia/u);
});
```

- [ ] Create a schema-valid evidence shell with all fourteen cases marked `NOT_RUN`, verify JSON parsing succeeds, then run `node --test tests/acceptance/evidence-schema.test.mjs`; expect the named all-cases-pass assertion to FAIL with `NOT_RUN`; ENOENT is not accepted.

- [ ] **GREEN: create manifest and preflight.** Manifest declares sample duration `1800000..3600000`, max duration `10800000`, max bytes `10737418240`, required formats, output 1080×1920/H.264/AAC, presets, fourteen criterion IDs, and qualitative threshold three. Preflight requires Apple `arm64`, Docker/Compose/uv/Python/FFmpeg exact versions, writable artifact directory, both env paths regular/readable/allowed, local ports free, fake OpenAI default, and the MLX cache at exact revision `49e6aa286ad60c14352c404340ded53710378a11` with weights SHA-256 `05ff791ce3630fae47e7c51004e9666204d786246ec07cac6110af768099b40d`. Normal acceptance transcription runs with Hugging Face network access blocked and fails if any download is attempted.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

- [ ] Run `pnpm acceptance:preflight`; expect actionable failure until the two environment paths are set, then PASS without modifying either file.

- [ ] **RED: runner dry-run test.** With synthetic stubs it must emit one command/evidence target per criterion, refuse real OpenAI unless `OPENAI_SMOKE=1` plus cap, and create no secret-bearing environment dump.

- [ ] **GREEN:** `run-phase-1.mjs` starts Task 4 lifecycle, drives Task 34/35 Playwright acceptance project, records source before/after stat/fingerprint, stage/progress/ETA events, workflow/activity IDs/counts, media probes, render sibling outcomes, costs, both paid ambiguity crash cases, service/worker restarts, three presets, upload/filepath, relink/delete, then stops only processes it started. It writes `.artifacts/acceptance/<UTC timestamp>/evidence.json` and updates `latest` symlink.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

- [ ] **RED/GREEN privacy audit:** recursively scan evidence, logs, diagnostics, complete Temporal workflow histories/activity inputs/activity results, Redis values, MinIO metadata, public API **responses**, public request captures except the explicitly permitted filepath-create/relink input field, and every database JSON/JSONB or text column except the allowlisted `source_assets.display_path` and `source_assets.resolved_path` columns for API-key patterns, raw absolute paths, `file://`/capability URLs, transcript phrases sampled by hash, and media magic bytes. Query PostgreSQL metadata to prove path-shaped values occur only in those two intended columns. Assert render/preview payloads contain immutable local fingerprint/size/mtime or upload key/version/hash but no resolved/temp path; public project/source presentation returns a safe basename or user-entered display label rather than the resolved path; authenticated locator bodies are excluded from access/body logs; the OpenAI fake audit request contains only transcript/instruction/schema; and local source hashes are unchanged.

- [ ] **Manual qualitative gate:** checklist records three clip IDs, hook/coherence/payoff review, minor edits performed, reviewer/date, and `MANUAL_PASS`. It states this is sample evidence, not a guaranteed model outcome. A failing qualitative gate keeps Phase 1 unaccepted without rewriting automated results.

- [ ] **3-hour/10-GB gate:** max-source test may use sparse/generated accepted container only if ffprobe duration/streams are valid; record no completion SLA. Verify the app accepts/processes streaming input without 32-bit/memory buffering and records measured progress.

- [ ] **Ambiguous paid-call gate:** use deterministic fake crash after callback commit to prove one provider call after reconciliation; fake crash after send/before durable result to prove state `PAID_CALL_UNCERTAIN`, no ETA or automatic retry, possible-spend disclosure, explicit acknowledgement, fresh reservation, then second call.

- [ ] **REFACTOR:** `privacy-audit.mjs` writes only rule IDs/counts, evidence hashes every artifact, runner is resumable/idempotent by acceptance run ID, and cleanup never deletes user source. Before and after forced cancellation/failure at preprocess, preview, and render stages, enumerate the configured worker workspace and assert no materialized upload, ASS, partial MP4, or abandoned activity directory remains.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

## Complete final verification

```bash
pnpm verify
pnpm test:integration
pnpm test:media
pnpm test:e2e
pnpm acceptance:preflight
pnpm acceptance:phase1 --fixture tests/fixtures/acceptance/manifest.json
pnpm acceptance:privacy-audit --evidence .artifacts/acceptance/latest
node --test tests/acceptance/evidence-schema.test.mjs
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated packages/contracts/test-fixtures/cost-conformance-vectors.json
git diff --check
```

Expected: every automated criterion is PASS, qualitative criterion is MANUAL_PASS, privacy scan is clean, source hashes match, and acceptance artifacts remain ignored.

**Suggested commit:** `test: add apple silicon phase one acceptance gate`
