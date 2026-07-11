# Clip Factory Phase 1 Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved local-first Clip Factory Core MVP from source intake through editable, downloadable 1080×1920 clips, with bounded paid analysis, durable recovery, and no Phase 2 publishing behavior.

**Architecture:** A pnpm monorepo hosts a Next.js control plane and versioned shared contracts; a native macOS Python worker executes deterministic Temporal workflows whose I/O is confined to activities and adapters. PostgreSQL is application truth and is written only by Next.js, MinIO owns media artifacts, Redis owns rebuildable live projections, and Temporal owns execution history. Every protected boundary uses application-owned ports and distinct API, Entity, Record, Client, provider, and Temporal payload types with explicit tested converters.

**Tech Stack:** Node.js 24.18.0, pnpm 11.11.0, TypeScript 7.0.2, Next.js 16.2.10, React 19.2.7, Prisma/@prisma/client/@prisma/adapter-pg 7.8.0, Vitest 4.1.10, Playwright 1.61.1, uv 0.11.28, Python 3.12.11, Temporal Python SDK 1.30.0, Pydantic 2.13.4, OpenAI Python SDK 2.45.0, MLX Whisper 0.4.3, pytest 9.1.1, Ruff 0.15.21, mypy 2.2.0, import-linter 2.13, PostgreSQL 17.5, Redis 8.0.5, MinIO `RELEASE.2025-04-22T22-12-26Z`, Temporal Server 1.29.7, Docker Engine 29.4.0, Docker Compose 5.1.2, and FFmpeg/ffprobe 8.1.2.

## Approved Sources

- [Core MVP design](../../specs/2026-07-11-clip-factory-core-design.md)
- [Decision log](../../specs/2026-07-11-clip-factory-decision-log.md)
- Phase 2 is intentionally excluded; its [separate approved design](../../specs/2026-07-11-clip-factory-youtube-publishing-design.md) may consume, but must not change, the Phase 1 boundaries defined here.

## Global Constraints

- Strict witnessed RED → GREEN → REFACTOR is mandatory. Before writing the behavioral test, create only the compile-safe package/module shells, owned interfaces, DTO declarations, and neutral stub implementations needed for imports and test collection to pass; verify the task's test target with `--collect-only`, `tsc --noEmit`, or the narrow equivalent. The witnessed RED must then be a named behavioral assertion failure—never ENOENT, missing import/module, failed collection, unavailable fixture, connection refusal, or absent setup. If behavior is implemented before that witnessed assertion failure, delete it and restart that cycle.
- Dependencies point inward: `delivery -> application -> domain`, `adapters -> application -> domain`, and `composition -> delivery + adapters + application`. Delivery and adapters never import one another.
- Controllers validate and map transport concerns, then call one application entry point. Services own policy and orchestration. Each data service imports exactly one application-owned repository port. Application repository ports and data services accept/return Entity DTOs only; each concrete repository owns one table/entity and privately converts Entity DTOs to/from adapter-private Record DTOs.
- API Schema DTOs, Entity DTOs, Record DTOs, Client Schema DTOs, provider models, Temporal payloads, and UI presentation models remain distinct. Enums are boundary-owned. API↔Entity and Client↔Entity converters live at their delivery/client boundaries; Entity↔Record converters and Record DTOs live entirely inside concrete persistence adapters. Each converter has direct tests, and application ports/services/data services may not import Record DTOs or persistence converters.
- Every code-changing GREEN names the exact file/function or includes exact code, then runs an exact narrow command whose expected result is PASS. Every REFACTOR names the structural change and reruns the previously green narrow tests plus the relevant architecture check; prose such as “run the test” is not sufficient execution evidence.
- Command binding is literal: when a GREEN/REFACTOR line is followed by an explicit run command and `expect PASS`, that is its command. When no narrower command is printed beside the step, every non-`git` command in that task's `Verification` code block is the exact required command set immediately after that GREEN, with PASS expected; after its REFACTOR, rerun the same set. This fallback is part of each checklist item, so no code-changing step may be marked complete using only a later CI run.
- Domain/application TypeScript has no Next.js, React, Prisma, Redis, MinIO, Temporal, OpenAI, FFmpeg, Node filesystem, or provider SDK imports. Python domain/application has no Temporal, Pydantic transport, FFmpeg, MLX, OpenAI, MinIO, Redis, or HTTP implementation imports.
- Temporal workflows are deterministic. Filesystem, clock, random, network, subprocess, model, tokenization, pricing snapshot lookup, and provider I/O occur in activities/adapters and enter workflows as versioned values.
- Next.js is the sole PostgreSQL writer. Python sends authenticated idempotent result callbacks and large artifacts move by MinIO object reference, never in Temporal or Redis payload bodies.
- Use narrow application-owned ports, typed errors, exhaustive states, decimal-safe money in integer micro-USD, UTC timestamps, generated identifiers, argv-only subprocesses, and sanitized object keys. No unchecked `any`, broad casts, provider substitution, silent fallback, generic repositories, infrastructure god interfaces, or boolean-flag APIs.
- Raw media, audio, paths, transcript text, and secrets never enter default logs. `OPENAI_API_KEY` exists only in the native worker environment. `.env` is ignored; `.env.example` contains names and nonsecret local values only.
- Phase 1 is localhost-only, single-user, no-auth, one media job at a time by default, no deployment/release/registry workflow, no real external API call in default CI, and no YouTube source or publishing integration.
- Supported inputs are MP4, MOV, MKV, and WebM, at most 3 hours and 10 GB. Output is 1080×1920 H.264/AAC MP4. Manual mode and manual clips must persist exactly zero OpenAI usage.
- Defaults are `gpt-5.6-sol`, high reasoning, five clips, 60 seconds, YouTube Shorts safe-area guide, and a 1.5× cost safety factor. The initial allowlist also offers `gpt-5.5` as an explicit fallback when the account lacks GPT-5.6 entitlement; model-access checks perform no inference, unavailable options are disabled/labeled, and fallback is never silent. Versioned catalog data is authoritative and a model/reasoning/coverage/retry change is never silent.
- GPT-5.6 requests use explicit prompt-cache mode with no breakpoints in the MVP, preventing cache reads/writes and separate cache-write charges. `max_output_tokens` is one cap over reasoning, visible output, and formatting; `usage.output_tokens` is billed once and reasoning detail is diagnostic only.
- A post-send paid-call outcome without durable response reconciliation enters waiting state `PAID_CALL_UNCERTAIN`, has no ETA or automatic provider retry, discloses possible unreported spend separately, and requires explicit user authorization plus a fresh reservation after reconciliation confirms no result.
- Each task is one independently reviewable commit candidate. Run its narrow RED and GREEN commands before broader checks; do not batch unwitnessed tests across tasks.

## Repository and Worktree Assumptions

- The implementation worktree starts from the final commit containing the approved specs and both complete phase-plan folders. Do not execute from an earlier specs-only commit or hard-code a moving `master` hash.
- Execute this plan in an isolated worktree created with `superpowers:using-git-worktrees`; never implement directly on `master` and never discard unrelated user changes.
- Remote `origin` is HTTPS for `Danangjoyoo/clip-factory`. Do not change remote, default branch, rulesets, or GitHub settings without separate authorization.
- Local evidence on 2026-07-11: Node 24.11.1, pnpm 11.11.0, Python 3.14.2, Docker 29.4.0, and Compose 5.1.2 are installed; `uv` and `ffmpeg` are absent. Task 1 installs/checks uv 0.11.28 and Python 3.12.11 before its worker tests; Task 4 installs/checks FFmpeg 8.1.2 and the Compose services before media work.
- Exact dependency versions are recorded without ranges in manifests and lockfiles. Container images are pinned to immutable digests after the named-version smoke check in Task 4.

## Authoritative Workspace and Commands

| Path | Ownership |
|---|---|
| `apps/web` | `@clip-factory/web`, Next.js delivery, application policy, adapters, composition, and sole Prisma owner |
| `apps/worker` | `clip-factory-worker`, import root `clip_factory`, native Temporal/media/ML worker |
| `packages/contracts` | `@clip-factory/contracts`, authoritative JSON Schemas and generated TypeScript |
| `packages/config` | `@clip-factory/config`, versioned nonsecret model/pricing/platform catalogs |
| `infra/compose` | local and CI Compose, health checks, Docker build inputs |
| `prisma` | Prisma 7 schema, config, generated client output declaration, reviewed SQL history |
| `tests/fixtures` | generated synthetic definitions and non-user-media fixtures |

Root scripts are authoritative: `format`, `format:check`, `lint`, `typecheck`, `test:unit`, `test:coverage`, `test:architecture`, `test:contracts`, `test:integration`, `test:media`, `test:e2e`, `prisma:generate`, `db:migrate:dev`, `db:migrate:deploy`, `compose:config`, `compose:up`, `compose:down`, `worker:sync`, `worker:test`, `dev`, and `verify`.

TypeScript tests are colocated as `*.test.ts` or `*.test.tsx`; Python tests mirror `src/clip_factory` below `apps/worker/tests`, with synthetic media integration specifically under `apps/worker/tests/media`; other cross-system tests live under `tests/integration` and `tests/e2e`. Contract source is `packages/contracts/schema/*.schema.json`, generated TypeScript is `packages/contracts/src/generated/`, and generated Python is `apps/worker/src/clip_factory/entrypoints/contracts/generated/`.

## Task Index and Authoritative Order

| # | Task | Primary deliverable |
|---:|---|---|
| 1 | [Workspace bootstrap](task-1.md) | pinned monorepo, Next/Python shells, test runners, root commands |
| 2 | [Architecture enforcement](task-2.md) | executable dependency, cycle, forbidden-import, and DTO-leak gates |
| 3 | [Configuration and catalogs](task-3.md) | validated secrets boundary and versioned model/pricing/platform data |
| 4 | [Compose and native lifecycle](task-4.md) | localhost services, persistent volumes, health waits, native preflight/start/stop |
| 5 | [Cross-runtime contracts](task-5.md) | versioned schemas, deterministic TS/Python generation, compatibility fixtures |
| 6 | [Prisma core data model](task-6.md) | all durable Phase 1 records, reviewed baseline migration, table constraints |
| 7 | [Project persistence and public API](task-7.md) | project/source repositories, one-repository data services, thin project routes |
| 8 | [Internal worker callbacks](task-8.md) | service credential, idempotency keys, terminal mutation protection |
| 9 | [Multipart object storage](task-9.md) | scoped MinIO keys, presigned upload/resume/complete and object lifecycle |
| 10 | [Local filepath and relink](task-10.md) | allowed-root realpath validation, fingerprint, missing/changed/relink behavior |
| 11 | [Media validation and preprocessing](task-11.md) | argv-only ffprobe/FFmpeg, source limits, normalized speech audio |
| 12 | [Local transcription](task-12.md) | pluggable MLX/fake transcriber, word timestamps, versioned transcript artifact |
| 13 | [Deterministic Temporal workflow](task-13.md) | one-job queue, canonical state machine, activities/signals/replay tests |
| 14 | [Cost planning and budget gate](task-14.md) | preflight, verified 1.5× gate, paid-call reservation, budget actions |
| 15 | [OpenAI highlight analysis](task-15.md) | semantic windows, Structured Outputs, bounded retry, ranked candidates |
| 16 | [Usage provenance and allocation](task-16.md) | immutable events, exact cost, equal-share candidate allocations |
| 17 | [Progress, ETA, Redis, and SSE](task-17.md) | measured progress, learned ranges, rebuildable projection and reconnect stream |
| 18 | [Smart reframe](task-18.md) | proxy tracking, smoothing, center fallback, manual focal override |
| 19 | [Caption and render specification](task-19.md) | editable cue/style models, safe-area validation, normalized render schema |
| 20 | [Manual Add Clip](task-20.md) | timecode validation, cue copy, local preparation, explicit zero spend |
| 21 | [Preview generation](task-21.md) | shared render-spec preview path and filmstrip artifacts |
| 22 | [Full-resolution rendering](task-22.md) | ASS/FFmpeg compile, VideoToolbox/software profiles, immutable render snapshot |
| 23 | [Render batches and downloads](task-23.md) | independent clip results, failed-only retry, individual/archive/SRT downloads |
| 24 | [Projects library UI](task-24.md) | persistent library, source health, totals, deletion workflow, narrow layout |
| 25 | [New Project UI](task-25.md) | source tabs, mode toggle, language/model/budget/limit controls, preflight |
| 26 | [Processing UI](task-26.md) | stage timeline, ETA, health/logs, cancel/retry/budget actions |
| 27 | [Editor filmstrip and timeline](task-27.md) | desktop editor shell, selection, precise trimming, Add Clip, render actions |
| 28 | [Editor inspectors and safe guides](task-28.md) | caption/frame/metadata editing, title, guides, keyboard and reduced motion |
| 29 | [Usage views](task-29.md) | project/run/call/allocation/render/model provenance with exact labels |
| 30 | [Settings, health, and diagnostics](task-30.md) | roots/cache/defaults/catalog status, full health, redacted local observability |
| 31 | [Recovery, cancellation, and cleanup](task-31.md) | bounded retry, restart reuse, subprocess termination, orphan cleanup, offline queue |
| 32 | [Infrastructure integration](task-32.md) | fresh migrations, real Postgres/Redis/MinIO/Temporal, callback and contract tests |
| 33 | [Synthetic media integration](task-33.md) | generated probe/trim/audio/caption/render assertions without user media |
| 34 | [Core Playwright journeys](task-34.md) | both sources, manual zero-cost path, presets, delete/relink, accessibility smoke |
| 35 | [AI and recovery Playwright journeys](task-35.md) | fake Responses usage, budget pause, reconnect, sibling render failure |
| 36 | [CI and security automation](task-36.md) | all required CI jobs, CodeQL, Dependabot, pinned actions, absence guards |
| 37 | [Final Apple Silicon acceptance](task-37.md) | repeatable native runbook and evidence for all fourteen acceptance criteria |

## Approved-Spec Coverage Map

| Design sections | Owning tasks |
|---|---|
| §§1–8 product, scope, deployment, technology, repository, architecture | 1–5, 13, 24, 30, 36–37 |
| §§9–12 source input, modes, settings, transcription | 3, 7, 9–12, 20, 24–25, 34 |
| §13 paid analysis, pricing, provenance, ambiguous outcomes | 3, 5–6, 8, 14–17, 26, 29, 31, 35, 37 |
| §14 smart reframe | 18, 20–22, 28, 33–35 |
| §15 captions and styling | 19, 21–22, 28, 33–35 |
| §16 Manual Add Clip | 20, 27–28, 34 |
| §17 screens, UX, accessibility, visual direction | 17, 24–30, 34–35 |
| §18 rendering and output | 19, 21–23, 27–28, 33–35 |
| §§19–20 data model and workflow states | 5–8, 12–23, 26, 29, 31–32 |
| §§21–22 progress, ETA, contracts | 5, 8, 13–17, 21–23, 26, 31–32, 35 |
| §23 failure and recovery | 8, 13–17, 22–23, 26, 31–32, 35, 37 |
| §§24–25 security, privacy, PostgreSQL pivot | 3–12, 15–16, 22–23, 30–32, 36–37 |
| §§26–27 Git, CI, and test strategy | 1–2, 32–36 |
| §28 observability | 17, 24, 26, 29–32, 37 |
| §29 fourteen acceptance criteria | 32–37 |
| §30 mandatory architecture and quality | every task; enforcement is concentrated in 2, 5–8, 12–23, 31–32, and 36 |

## Dependencies and Parallelization

- Tasks 1–6 are the shared foundation and execute in order; Task 2 may be drafted beside Task 1 but its RED run waits for Task 1.
- After Task 6, Tasks 7–10 may be implemented in parallel only if each reserves its migration timestamp and does not edit another task's schema models. Task 8 consumes Task 7's application entry point; merge Task 7 first.
- Tasks 11–16 are serial through the paid-analysis critical path. Task 13 must land before any real workflow activity is registered. Task 14's reservation/idempotency protocol must land before Task 15's OpenAI adapter.
- Task 17 can proceed after Task 13 while Tasks 14–16 are underway. Tasks 18 and 19 can proceed in parallel after Tasks 12 and 5, then merge before Tasks 20–23.
- Tasks 24 and 25 can proceed after Task 7; Task 26 waits for Task 17; Tasks 27 and 28 wait for Tasks 19–21 and may be implemented in parallel against frozen presentation interfaces; Task 29 waits for Task 16; Task 30 waits for Tasks 3, 4, and 17.
- Task 31 integrates the settled workflow/render paths and therefore follows Task 23. Tasks 32 and 33 may proceed in parallel after Task 31. Tasks 34 and 35 may proceed in parallel after Tasks 24–33. Task 36 assembles already-green commands and Task 37 is last.
- Never parallelize edits to `prisma/schema.prisma`, the same migration directory, a shared JSON Schema, or the canonical workflow transition table without first freezing and reviewing the interface delta.

## Phase Acceptance Gates

1. **Foundation gate, Tasks 1–6:** pinned installs succeed; Compose config is valid; schema generation is reproducible; fresh PostgreSQL receives the complete reviewed migration; architecture and contract gates detect seeded violations.
2. **Ingest gate, Tasks 7–12:** both source methods validate; local files remain read-only; upload resumes; accepted formats/limits are enforced; transcript words and metadata persist by object reference; no paid provider is reachable.
3. **Workflow and AI gate, Tasks 13–17:** replay is deterministic; one-job scheduling and waiting states work; no paid request can start without a 1.5× safe reservation; fake Structured Output creates bounded candidates; actual usage and equal-share allocations reconcile; progress is measured and ETA is a labeled range.
4. **Editing and output gate, Tasks 18–23:** crop tracks are stable, manual clips cost zero, preview and render share one normalized spec, outputs are 1080×1920 H.264/AAC, sibling failures isolate, and successful outputs/download archives remain available.
5. **UX and operations gate, Tasks 24–31:** all six screens satisfy content, accessibility, narrow-view, metadata, redaction, health, cancellation, restart, cleanup, and worker-offline requirements.
6. **Automation gate, Tasks 32–36:** disposable-infrastructure, media, and Playwright suites pass with deterministic fakes; CI applies migrations from zero, regenerates contracts, builds images, rejects boundary leaks, uses no paid/external secrets, and contains no deployment path.
7. **Native acceptance gate, Task 37:** an Apple Silicon run records evidence for all fourteen numbered criteria in design §29, including qualitative sample review, 3-hour/10-GB support, privacy audit, restart deduplication, both inputs, all safe-area presets, deletion, relinking, and an ambiguous paid call that pauses until an explicitly authorized fresh reservation.

## Complete Verification

Run from the repository root with the native worker environment synced and Compose services healthy:

```bash
corepack pnpm --version
node --version
pnpm install --frozen-lockfile
pnpm worker:sync
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm test:architecture
pnpm test:contracts
pnpm compose:config
pnpm compose:up
pnpm db:migrate:deploy
pnpm test:integration
pnpm test:media
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm --filter @clip-factory/web build
docker compose --env-file .env -f infra/compose/docker-compose.yml build --pull
pnpm verify
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated
git diff --check
```

Native-only acceptance is deliberately separate from Ubuntu CI:

```bash
pnpm acceptance:preflight
pnpm acceptance:phase1 --fixture tests/fixtures/acceptance/manifest.json
pnpm acceptance:privacy-audit --evidence .artifacts/acceptance/latest
```

Expected result: every command exits 0; generated output and migration application leave no diff; default tests use fake OpenAI/transcription adapters; acceptance evidence contains identifiers, probes, timings, costs, and redacted logs but no media copy, transcript text, raw path, or secret.
