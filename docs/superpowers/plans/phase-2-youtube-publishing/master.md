# Clip Factory Phase 2 YouTube Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each `task-N.md` is one review gate and must be completed with witnessed red-green-refactor evidence before the next dependent task starts.

**Goal:** Add a secure, local-first, project-level YouTube publishing workspace that generates approved per-clip metadata, connects one channel through native loopback OAuth, uploads rendered Shorts privately with resumable recovery, and delegates independently timezone-aware schedules to YouTube.

**Architecture:** Phase 2 is an additive `youtube-publishing` feature. Next.js owns public/internal HTTP delivery and PostgreSQL records; pure application services own approval, scheduling, private-first, idempotency, and recovery policy; the native Python worker owns OAuth, Keychain, OpenAI, Google HTTP, and deterministic Temporal workflows whose I/O occurs only in activities/adapters. HTTP API DTOs, Entity DTOs, Record DTOs, Google/OpenAI client DTOs, Temporal payloads, and UI view models remain distinct and cross only through tested converters.

**Tech Stack:** pnpm workspace; Node.js 24.18.0; pnpm 11.11.0; Next.js 16.2.10; React 19.2.7; TypeScript 7.0.2; Prisma ORM, `@prisma/client`, and `@prisma/adapter-pg` 7.8.0; PostgreSQL 17.5; Redis 8.0.5; MinIO `RELEASE.2025-04-22T22-12-26Z`; Temporal Server 1.29.7; Temporal Python SDK 1.30.0; Vitest 4.1.10; Testing Library; Playwright 1.61.1; `uv` 0.11.28; Python 3.12.11; Pydantic 2.13.4; OpenAI Python SDK 2.45.0; HTTPX 0.28.1; keyring 25.7.0; pytest 9.1.1; pytest-httpserver 1.1.5; Ruff 0.15.21; mypy 2.2.0; import-linter 2.13; `@js-temporal/polyfill` 0.5.1; Docker Engine 29.4.0; Docker Compose 5.1.2; FFmpeg/ffprobe 8.1.2.

## Approved specifications

- [Core MVP design](../../specs/2026-07-11-clip-factory-core-design.md)
- [YouTube publishing design](../../specs/2026-07-11-clip-factory-youtube-publishing-design.md)
- [Decision log](../../specs/2026-07-11-clip-factory-decision-log.md)
- Current provider references used by the adapters: [desktop OAuth and loopback redirect](https://developers.google.com/identity/protocols/oauth2/native-app), [resumable upload protocol](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol), [video resource and scheduling](https://developers.google.com/youtube/v3/docs/videos), [video insert audit restriction](https://developers.google.com/youtube/v3/docs/videos/insert), [processing status](https://developers.google.com/youtube/v3/docs/videos/list), [thumbnail API](https://developers.google.com/youtube/v3/docs/thumbnails/set), [Shorts thumbnail limitation](https://support.google.com/youtube/answer/72431?hl=en-GB), and [hashtag policy](https://support.google.com/youtube/answer/6390658?hl=en).

## Hard Phase 1 acceptance gate

No Phase 2 implementation task may start until all of the following are true:

1. The user has explicitly accepted every criterion in Core MVP Design section 29, including the Apple Silicon 30–60 minute acceptance sample and the 3-hour/10-GB support check.
2. Phase 1 `master` passes `pnpm verify`, the complete migration history on disposable PostgreSQL, synthetic media integration, and the Phase 1 Playwright suite.
3. Phase 1 proves restart idempotency, zero OpenAI usage for manual work, local-media privacy, independent render failure, and architecture enforcement.
4. The accepted Phase 1 branded IDs, Entity DTOs, root scripts, contract generators, internal worker authentication, object-reference conventions, and module boundaries are treated as immutable inputs to this plan.

If any item is absent or failing, stop. Fix and re-accept Phase 1 under its own plan; do not use Phase 2 to weaken, rename, bypass, or retroactively restructure a Phase 1 boundary.

## Global constraints

- **Strict witnessed TDD:** No production line is written before its focused test is observed failing for the expected missing-behavior reason. Record the RED command/output, implement only the minimum GREEN, rerun the same command, then REFACTOR while green. A test that passes immediately or fails from syntax/setup does not witness RED.
- **RED collection seam:** Every RED command must collect and execute. For a newly created module, route, migration, generated file, or evidence file, first create only the exact public signature/schema shell shown in that task's **Interfaces** or RED fixture and return the task's typed not-implemented result (`NotImplementedError('<behavior>')`, `Error('NOT_IMPLEMENTED:<behavior>')`, or HTTP `501 { code: 'NOT_IMPLEMENTED' }`). Missing imports/modules, syntax/configuration errors, route `404`, missing relations, and `ENOENT` do not count as RED. Each RED section names the first behavior assertion that must fail; GREEN replaces the shell without weakening the assertion.
- **Paid-call uncertainty:** Metadata generation inherits Phase 1's durable paid-call reservation and canonical `PAID_CALL_UNCERTAIN` state. After an ambiguous post-transmission OpenAI timeout/crash, never retry automatically, never overwrite the current draft, disclose possible prior spend, and require a separately confirmed fresh reservation before a new attempt.
- **Model access and cache policy:** Metadata generation consumes the Phase 1 compatible-model catalog and non-inference access projection: `gpt-5.6-sol`/high is the default and `gpt-5.5` is an explicit selectable fallback. An unavailable selection blocks before reservation; the application never silently substitutes model or reasoning. GPT-5.6 Responses use explicit prompt-cache mode with no breakpoints, so cache read/write usage is zero and no cache-write charge can appear; unsupported cache options are omitted for GPT-5.5.
- **Upload uncertainty:** Before the final resumable chunk, durably mark final dispatch. A lost final response/video ID or later session `404` after that marker enters canonical `UPLOAD_OUTCOME_UNCERTAIN`; never create a replacement automatically. Reconcile the authorized channel first, then require explicit acknowledgement that a duplicate remote video may exist before a new upload intent.
- **Clean Architecture:** Dependencies point `delivery -> application -> domain` and `adapters -> application -> domain`; only composition roots construct adapters. UI, route handlers, application services, and Temporal workflows never import Google, OpenAI, keyring, Prisma, or concrete Temporal clients.
- **Clean Code/SOLID/DRY:** Keep functions cohesive, names product-specific, ports use-case-specific, state transitions exhaustive, errors typed, and shared abstractions limited to proven product concepts. No generic repositories, provider switches in application code, boolean-flag APIs, unsafe `any`, silent fallback, or speculative base classes.
- **Persistence ownership:** Next.js is the only PostgreSQL writer. Application owns repository ports and their Record DTO contracts; each data service imports exactly one matching port and no adapter. Prisma repositories implement one port/table each and are injected only by composition. Cross-table transactions, approval, schedule, idempotency, and upload decisions stay in application services.
- **Boundary types:** API Schema DTOs, Entity DTOs/value objects, Record DTOs/enums, Google/OpenAI Client Schema DTOs/enums, Temporal payloads, and UI view models are separate. Converters explicitly map enum values, optional fields, money, timestamps, provider identifiers, scopes, and sanitized errors.
- **Credential containment:** Refresh tokens live only in macOS Keychain; access tokens, authorization codes, PKCE verifiers, and raw one-time state live only in native-worker memory. Redis receives only a state digest and sanitized ten-minute flow projection. PostgreSQL, MinIO, Docker, browser storage, Temporal payloads, logs, diagnostics, fixtures, and Git receive no token material.
- **OAuth:** Use a Desktop OAuth client, the system browser, random `127.0.0.1` loopback port, one callback, exact host/path checks, ten-minute expiry, one-time high-entropy state, PKCE S256 with a 43–128-character verifier, and exactly `youtube.upload` plus `youtube.readonly`. Manual copy/paste and embedded webviews are forbidden.
- **Publishing:** Rendering never uploads. Every metadata generation, approval, and upload is explicit. Upload is private-first; `publishAt` is supplied only with `privacyStatus=private` for a never-published video and only when the configured API project is verified. Each selected clip has an independent workflow and failure boundary.
- **YouTube limits:** Upload eligibility requires a successful 9:16 render no longer than 180 seconds. Title is nonempty, at most 100 Unicode code points, and excludes `<`/`>`; description is at most 5000 UTF-8 bytes and excludes `<`/`>`; keyword tags use YouTube's comma/quoted-space accounting and stay at or below 500 characters; generated hashtags are relevant, contain no spaces, and are capped at eight while all reviewed metadata rejects 60 or more hashtags.
- **Scheduling:** UI input is local date/time plus IANA timezone; ambiguous or nonexistent wall time is rejected; PostgreSQL stores the source timezone and normalized UTC instant. Past times fail. Duplicate/close times require explicit per-submission confirmation rather than silent movement.
- **Resumable upload:** Persist an opaque resumable session reference and acknowledged byte offset, probe with `Content-Range: bytes */TOTAL`, resume at `Range end + 1`, honor `Retry-After`, and retry only transient `500/502/503/504` failures with bounded backoff. A session `404` before final dispatch may create a bounded replacement attempt. After final dispatch, an ambiguous response or `404` pauses in `UPLOAD_OUTCOME_UNCERTAIN`; local idempotency never claims provider-level exactly-once.
- **Thumbnail:** A best-effort `thumbnails.set` failure becomes a sanitized warning on a successful publication; it never turns upload success into failure and never promises placement for a Short.
- **Temporal determinism:** Workflows perform state orchestration only. Clock, random IDs, Keychain, filesystem/MinIO, OpenAI, Google OAuth/YouTube HTTP, browser launch, PostgreSQL callbacks, and logging run in activities/adapters. Payloads contain IDs, object references, immutable snapshots, and sanitized results—never SDK objects or credentials.
- **Testing:** Default CI uses deterministic fakes. Unit, converter, port-contract, disposable-PostgreSQL repository, fake-Google/OpenAI/YouTube integration, Temporal time-skipping/restart, component, and Playwright tests are mandatory. Real Google/OpenAI smoke is explicit opt-in, private-only, and excluded from default CI.
- **No Phase 1 weakening:** Publishing remains isolated under `apps/web/src/modules/youtube-publishing/` and worker `youtube_publishing` subpackages. Core DTOs gain no publishing fields. Additive FKs may reference Phase 1 IDs without making core modules depend on publishing.

## Repository and command conventions inherited from Phase 1

- Workspaces: `apps/web` (`@clip-factory/web`), `apps/worker` (`clip-factory-worker`, import root `clip_factory`), `packages/contracts` (`@clip-factory/contracts`), `packages/config` (`@clip-factory/config`).
- Shared schemas: `packages/contracts/schema/*.schema.json`; generated TypeScript: `packages/contracts/src/generated/`; generated Python: `apps/worker/src/clip_factory/entrypoints/contracts/generated/`.
- TypeScript tests are colocated as `*.test.ts` or `*.test.tsx`; Python tests mirror source paths under `apps/worker/tests/`; integration tests live in `tests/integration/`; Playwright tests live in `tests/e2e/`.
- Root commands: `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:coverage`, `pnpm test:architecture`, `pnpm test:contracts`, `pnpm test:integration`, `pnpm test:media`, `pnpm test:e2e`, `pnpm prisma:generate`, `pnpm db:migrate:dev`, `pnpm db:migrate:deploy`, `pnpm compose:config`, `pnpm compose:up`, `pnpm compose:down`, `pnpm worker:sync`, `pnpm worker:test`, `pnpm dev`, and `pnpm verify`.
- `pnpm test:architecture` runs dependency-cruiser, the TypeScript DTO/SDK leak scanner, and `uv run --directory apps/worker lint-imports`; `pnpm test:contracts` regenerates/validates both runtimes and rejects a generated diff.

## Task index

| Task | Reviewable deliverable | Depends on |
|---:|---|---|
| [1](./task-1.md) | Versioned publishing contracts and executable import/leak rules | Phase 1 gate |
| [2](./task-2.md) | Pure metadata, schedule, eligibility, and publication-state domain policy | 1 |
| [3](./task-3.md) | `YouTubeConnection` migration, repository, data service, and converters | 1, 2 |
| [4](./task-4.md) | Versioned `PublishingMetadataDraft` persistence and AI-usage linkage | 1, 2 |
| [5](./task-5.md) | `Publication` and `PublicationAttempt` persistence, active-intent uniqueness, and idempotency | 1, 2 |
| [6](./task-6.md) | Native OAuth PKCE/state/scope/redaction policy and owned ports | 1 |
| [7](./task-7.md) | System-browser loopback OAuth, Keychain, Google HTTP, refresh, and revocation adapters | 3, 6 |
| [8](./task-8.md) | Connection orchestration, internal/public APIs, status UI, reconnect, and disconnect | 3, 6, 7 |
| [9](./task-9.md) | Separately budgeted OpenAI metadata-generation workflow and exact cost provenance | 1, 2, 4, 6 |
| [10](./task-10.md) | Metadata draft editor, manual edits, regeneration versioning, and explicit approval | 4, 9 |
| [11](./task-11.md) | Google/YouTube client DTO converters and resumable publisher adapter with fake-server contract tests | 1, 2, 6 |
| [12](./task-12.md) | Deterministic per-clip Temporal publication workflow, progress callbacks, restart/reconciliation, polling, cancellation, upload uncertainty, and thumbnail warning | 3, 5, 7, 11 |
| [13](./task-13.md) | Project YouTube gallery/list workspace and local view preference | 3, 4, 5, 8 |
| [14](./task-14.md) | Independent scheduling, private-first upload/batch controls, progress, errors, retry, and recovery UI | 5, 10, 12, 13 |
| [15](./task-15.md) | Credential-absence, redaction, contract parity, diagnostics, and architecture security gates | 7, 8, 9, 11, 12, 14 |
| [16](./task-16.md) | Full Phase 2 Playwright/integration/CI coverage, opt-in private smoke, and final acceptance evidence | 1–15 |

## Dependencies and safe parallelization

Use one implementer per task and merge only after the task's own review gate. Safe waves are:

1. Task 1 alone establishes generated contracts and import rules.
2. Task 2 and Task 6 may run in parallel after Task 1 because one is TypeScript product policy and the other is Python OAuth policy.
3. Tasks 3, 4, and 5 may run in parallel after Task 2 if each owns only its named table/repository/data service; Task 7 may proceed in parallel after Tasks 3 and 6.
4. Tasks 8, 9, and 11 may run in parallel once their listed prerequisites land. They must not edit each other's application services or adapter files.
5. Tasks 10, 12, and 13 may run in parallel after their prerequisites. Task 12 owns worker publication orchestration; Task 10 owns metadata editor/approval; Task 13 owns read-only workspace presentation.
6. Task 14 integrates the user-triggered publishing path. Task 15 then proves cross-cutting containment. Task 16 runs only after every earlier gate is green.

If parallel branches touch `prisma/schema.prisma`, contract indexes, dependency-cruiser/import-linter configuration, root scripts, or composition roots, serialize those hunks and regenerate from the merged state.

## Approved-spec coverage map

| YouTube design section | Implemented and verified by |
|---|---|
| §§1–3 summary/goals/non-goals | Master constraints; Tasks 13–16 acceptance |
| §4 platform constraints | Tasks 2, 11, 14, 16 |
| §5 gallery/list workspace | Tasks 13, 14, 16 |
| §6 metadata generation/edit/cost/uncertainty | Tasks 2, 4, 9, 10, 14–16 |
| §§7–10 OAuth config/flow/storage/lifecycle | Tasks 3, 6–8, 15–16 |
| §§11–12 publication workflow/scheduling | Tasks 2, 5, 11–14, 16 |
| §§13–14 records/states including `UPLOAD_OUTCOME_UNCERTAIN` | Tasks 2, 3–5, 12–16 |
| §15 cover/thumbnail limitations | Tasks 11, 12, 14, 16 |
| §16 privacy/security | Tasks 1, 6–8, 15–16 |
| §17 test matrix and opt-in smoke | Tasks 6–16, especially 15–16 |
| §18 acceptance criteria 1–14 | Task 16 evidence manifest; task-level gates above |
| §19 Clean Architecture/boundary enforcement | Every task; Tasks 1 and 15 are cross-cutting enforcement |

Acceptance criteria map: criterion 1 → Task 15; 2–3 → Tasks 7–8/16; 4 → Task 13; 5 → Tasks 9–10; 6 → Tasks 2/12/14; 7 → Tasks 11–12; 8 → Tasks 2/11/14; 9 → Task 12; 10 → Tasks 11–14; 11 → Tasks 7–8; 12 → Tasks 1/15; 13 → Tasks 9–10/14–16; 14 → Tasks 5/11–16.

## Rollout and platform prerequisites

Before enabling the feature outside fake-adapter tests:

1. Run on the Phase 1-supported Apple Silicon Mac with Docker Desktop, an unlocked user login Keychain, a default system browser, and loopback networking available.
2. Create a Google Cloud project, enable YouTube Data API v3, configure the OAuth consent screen, and create a **Desktop app** OAuth client.
3. Save the downloaded client JSON outside the repository and Docker mounts, under the user's Clip Factory configuration directory with mode `0600`; expose only its path to the native worker as `YOUTUBE_OAUTH_CLIENT_CONFIG_PATH`.
4. Set native-worker-only `YOUTUBE_OAUTH_BASE_URL=https://accounts.google.com`, `GOOGLE_TOKEN_BASE_URL=https://oauth2.googleapis.com`, and `YOUTUBE_API_BASE_URL=https://www.googleapis.com`; fake-test commands override all three with loopback URLs.
5. Default `YOUTUBE_API_PROJECT_VERIFIED=false`. Only an explicit local configuration change after the YouTube API compliance audit unlocks scheduled/public controls; this flag is never inferred from an upload response.
6. Enable the additive feature with `CLIP_FACTORY_YOUTUBE_PUBLISHING=true` only after the Phase 2 migration and worker dependencies are installed. Disabling the flag hides new UI/actions but preserves nonsecret records and accepted YouTube schedules.
7. For OAuth consent in Testing mode, display the seven-day refresh-token warning and expiry when provided; reconnect replaces the Keychain item for the same opaque connection UUID without deleting drafts, renders, publications, or YouTube IDs.
8. Use a dedicated test channel and generated private test clip for real smoke. Do not use personal media, automatic public visibility, or production credentials in CI.

Rollback is feature-flag-first: disable new starts, allow already accepted YouTube schedules to remain owned by YouTube, stop local polling safely, retain immutable nonsecret history, and never delete a remote video automatically. Database rollback is forward-fix only after data exists; do not drop publication tables to roll back application code.

## Phase acceptance gates

### Gate A — contracts and architecture

- JSON schemas reject token fields and malformed states in both runtimes.
- Generated TypeScript/Python output is current.
- Import tests fail on Google/OpenAI/keyring/Prisma/Temporal leakage and on dependency cycles.

### Gate B — persistence and pure policy

- Fresh PostgreSQL accepts the complete Phase 1 + Phase 2 migration history.
- Each repository is table-scoped, each data service imports one repository, and all API/Entity/Record converters have direct tests.
- Metadata bytes/characters/tags, schedule DST behavior, private-first policy, state transitions, and active-intent idempotency are green.

### Gate C — credential lifecycle

- Fake Google integration covers success, denial, mismatched/expired/consumed state, unexpected callback path/host, missing scopes, refresh, `invalid_grant`, timeout, reconnect, and revocation uncertainty.
- Restart uses the Keychain refresh token while access tokens remain memory-only.
- Security scans and sink tests demonstrate that forbidden credential fields never enter Docker, PostgreSQL, Redis payload values, MinIO, browser storage, Temporal histories, logs, diagnostics, fixtures, or Git.

### Gate D — metadata and approval

- Generate draft requires estimate/cap confirmation, sends only allowed transcript/project text, records one exact immutable `AIUsageEvent`, and never overwrites an approved/manual version.
- Both allowlisted models respect the Phase 1 access projection; unavailable GPT-5.6 never auto-selects GPT-5.5, and provider request fixtures prove each model's catalog-owned cache policy.
- Manual edits cost zero and upload is impossible without explicit approval of the exact immutable snapshot.
- An ambiguous post-transmission generation outcome enters `PAID_CALL_UNCERTAIN`; no draft is overwritten and a fresh attempt requires new explicit authorization/reservation with possible prior spend disclosed.

### Gate E — publication and recovery

- Fake YouTube proves private resumable create, `308` offset recovery, bounded `5xx` retry, pre-final expired-session replacement, returned video ID/URL, processing polling, independent failure, cancellation semantics, and warning-only thumbnail failure.
- A lost final response or post-final `404` enters `UPLOAD_OUTCOME_UNCERTAIN`, performs channel reconciliation, and starts no replacement until explicit duplicate-risk acknowledgement creates a new intent.
- Three clips retain three source timezones/UTC instants; accepted `publishAt` schedules remain valid with Clip Factory offline.
- Unverified-project controls and request payloads cannot represent scheduled/public upload.

### Gate F — product and CI

- Gallery/list exposes every rendered project clip and persists only the view preference locally.
- Connect/reconnect/disconnect, metadata generation/edit/approval, independent schedules, selected batch confirmation, progress, sanitized errors, retry, and successful/failed sibling behavior pass Playwright with deterministic fakes.
- Default CI performs no paid OpenAI/Google call, carries no external secret, and has no deployment/publish job.

### Gate G — optional production-enablement private smoke

- When the user opts in and provides a dedicated test channel, they intentionally run the command against that channel.
- The video remains private until manually inspected in YouTube Studio; the test records the sanitized video ID/URL and deletes no remote content automatically.
- If the user does not opt in, record Gate G as `NOT RUN (NO EXTERNAL CREDENTIAL AUTHORIZATION)`; this is not an implementation failure. If run, real smoke failure does not invalidate deterministic CI but blocks production enablement until investigated.

## Complete verification commands

Run from the repository root unless a task says otherwise:

```bash
corepack pnpm install --frozen-lockfile
pnpm worker:sync
pnpm prisma:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm test:architecture
pnpm test:contracts
pnpm db:migrate:deploy
pnpm test:integration
pnpm test:media
pnpm test:e2e
pnpm compose:config
pnpm verify
```

Run the focused Phase 2 suites while iterating:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing
pnpm exec vitest run tests/integration/youtube-publishing
uv run --directory apps/worker pytest tests/domain/youtube_publishing tests/application/youtube_publishing tests/adapters/youtube tests/entrypoints/temporal/youtube_publishing -q
pnpm exec playwright test tests/e2e/youtube-publishing.spec.ts
```

Run the credential and generated-output audit before acceptance:

```bash
pnpm test:architecture
pnpm test:contracts
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security
uv run --directory apps/worker pytest tests/security/test_youtube_credential_containment.py -q
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated
git grep -nE '(access_token|refresh_token|authorization_code|code_verifier|client_secret)' -- ':!docs/superpowers/plans/phase-2-youtube-publishing/**' ':!apps/worker/src/clip_factory/adapters/youtube/**' ':!apps/worker/tests/**'
git diff --check
```

The `git grep` command must return no matches. Adapter and test exclusions exist because native adapter code must name provider fields and containment tests must use inert sentinel strings; sink-scanning tests cover their runtime outputs.

The real smoke is intentionally absent from `pnpm verify` and default CI. Run it only after explicit confirmation:

```bash
CLIP_FACTORY_REAL_YOUTUBE_SMOKE=1 \
CLIP_FACTORY_REAL_YOUTUBE_VISIBILITY=private \
CLIP_FACTORY_REAL_YOUTUBE_ACK=I_ACCEPT_PRIVATE_TEST_UPLOAD \
uv run --directory apps/worker pytest tests/smoke/test_real_youtube_private_upload.py -q -m real_youtube
```

## Completion rule

Phase 2 implementation is complete only when every task review is accepted, Gates A–F pass on default CI, all fourteen YouTube design acceptance criteria have deterministic linked evidence, and no Phase 1 acceptance behavior regresses. Gate G is a separate optional production-enablement confidence check: record it as passed when explicitly authorized and run, or as not run when the user provides no external credential authorization. A passing happy-path upload alone is not completion.
