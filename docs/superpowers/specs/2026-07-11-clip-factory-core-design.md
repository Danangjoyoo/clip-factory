# Clip Factory Core MVP Design

**Status:** Approved in collaborative design review on 2026-07-11

**Implementation phase:** Phase 1

**Related documents:** [decision log](./2026-07-11-clip-factory-decision-log.md), [YouTube publishing design](./2026-07-11-clip-factory-youtube-publishing-design.md)

## 1. Product Summary

Clip Factory is a personal, local-first web application for turning long-form talking-head videos, interviews, and podcasts into upload-ready vertical clips. A user supplies a video by browser upload or local filepath, chooses whether OpenAI should discover highlights, reviews and edits the resulting clips, and renders 1080×1920 MP4 files with the source audio and styled captions burned in.

The application is optimized for an Apple Silicon Mac. Docker Compose runs the web and infrastructure services. A native Python worker performs media and machine-learning work so it can use Apple acceleration unavailable to Linux containers on Docker Desktop.

The MVP is single-user and binds to localhost. It has no authentication. Raw video, extracted audio, and preview frames stay on the machine. Only timestamped transcript text and the optional highlight instruction may be sent to OpenAI when AI Highlights mode is enabled.

## 2. Scope and Phasing

### Phase 1: Core MVP

Phase 1 includes:

- Persistent project library.
- Browser upload and local filepath source modes.
- Manual language selection for any supported local Whisper language.
- AI Highlights and Manual project modes.
- Local transcription with word timestamps.
- OpenAI-powered transcript highlight discovery with strict per-job budget controls.
- Smart vertical reframing with manual focal-point override.
- Filmstrip editor with timecode trimming, caption editing, styling, and platform safe-area guides.
- Manual Add Clip by start/end timecode in both project modes.
- Local rendering with stitched video, source audio, and burned-in captions.
- Individual downloads and download-all archive.
- Project-, analysis-, clip-, render-, timing-, model-, and cost-provenance views.
- Stage progress and estimated completion ranges.
- PostgreSQL, Redis, Temporal, MinIO, Docker Compose, and a native macOS worker.
- GitHub Actions CI with no deployment workflow.

### Phase 2: YouTube Publishing

YouTube OAuth, metadata generation, private upload, independent clip scheduling, project-level publishing gallery/list views, and YouTube status tracking are specified separately. Phase 2 begins only after the core pipeline passes its acceptance criteria.

## 3. Goals

- Produce clips that can be uploaded without further external editing.
- Preserve creative control over boundaries, captions, crop, and platform framing.
- Keep media private and local by default.
- Make paid model usage visible, attributable, and bounded before every request.
- Recover cleanly from process restarts, transient failures, missing local sources, and per-clip render failures.
- Keep the application architecture ready to move from local PostgreSQL to managed PostgreSQL without changing database engines.
- Make every production behavior test-first and reproducible in free public-repository CI.

## 4. Non-Goals

- Multi-user accounts, teams, or remote access.
- A general nonlinear video editor with arbitrary tracks, transitions, keyframes, or compositing.
- Gaming, sports, cinematic scene understanding, or general-purpose video highlight detection.
- Translation or bilingual captions.
- Cloud transcription or uploading media to OpenAI.
- Guaranteed highlight quality or a guaranteed number of good clips for a given dollar amount.
- An official or unofficial YouTube source downloader.
- Instagram or TikTok publishing integrations.
- Continuous deployment, package publishing, or production infrastructure.
- Automatic migration from a local-only single-user security model to a public multi-user service.

## 5. User and Deployment Model

- One user on one Apple Silicon Mac.
- Next.js is available only on `127.0.0.1` by default.
- No login is required in Phase 1.
- One media job runs at a time by default to protect local responsiveness and improve ETA accuracy.
- The editor is desktop-first for viewports at least 1024 px wide. Project library and progress views remain usable at narrower widths.
- Local filepath input is available only when the trusted native worker is paired with the localhost app. A future hosted deployment must use uploads unless it introduces a separately secured desktop companion.

## 6. Technology Decisions

| Area | Decision |
|---|---|
| Web | Next.js App Router with TypeScript |
| Web workspace | pnpm workspace |
| UI | Accessible React components and application-owned design tokens |
| Application database | PostgreSQL from the first commit |
| ORM | Stable Prisma ORM 7 with `@prisma/adapter-pg` |
| Database migrations | Reviewed Prisma Migrate SQL files |
| Live cache/job projection | Redis |
| Durable workflow orchestration | Temporal |
| Object storage | MinIO with S3-compatible APIs |
| Native worker | Python managed with `uv` |
| Apple-local transcription | Pluggable adapter; quality profile uses MLX Whisper with word timestamps |
| Media processing | FFmpeg/ffprobe, VideoToolbox when supported, deterministic software fallback |
| Subject tracking | Low-resolution proxy analysis with face/subject tracks and smoothing |
| Paid semantic analysis | OpenAI Responses API with Structured Outputs |
| Default analysis profile | `gpt-5.6-sol`, high reasoning; user can select supported model/reasoning combinations |
| Browser E2E | Playwright |
| TypeScript tests | Vitest and Testing Library |
| Python tests | pytest |
| CI | GitHub Actions on standard Ubuntu runners |
| Local lifecycle | Repository task commands wrap Docker Compose plus the native worker |

The OpenAI model catalog, supported reasoning levels, pricing rules, and long-context multipliers are versioned application data. A model is never substituted silently.

## 7. Repository Shape

The implementation plan will use focused units with these ownership boundaries:

```text
apps/
  web/                 Next.js UI, public APIs, internal worker APIs, Prisma access
  worker/              Native Python Temporal worker and media/AI adapters
packages/
  contracts/           Versioned JSON/OpenAPI schemas shared across runtimes
  config/              Nonsecret model/pricing/platform catalogs
infra/
  compose/             Local and CI Docker Compose definitions
prisma/
  schema.prisma        PostgreSQL product model
  migrations/          Reviewed SQL migration history
tests/
  fixtures/            Small generated fixture definitions, never user media
docs/
  superpowers/         Approved designs and implementation plans
```

Files will be split by responsibility. Next.js is the only application database owner. Python does not import Prisma, open PostgreSQL directly, or modify application tables.

## 8. System Architecture

### Docker Compose services

1. **Next.js web application**
   - Project library, upload flow, processing view, editor, usage view, and settings.
   - Public localhost APIs and authenticated internal worker-result APIs.
   - Prisma/PostgreSQL ownership.
   - Temporal client for starting and signaling workflows.
   - Presigned MinIO multipart-upload coordination.
   - Server-sent events for live progress.

2. **PostgreSQL**
   - Durable application records.
   - Persistent named volume.
   - Local credentials supplied through ignored environment files.

3. **Redis**
   - Live progress and ETA snapshots.
   - Worker heartbeat and health projection.
   - Event fan-out, bounded locks, and short-lived cache.
   - Never the only copy of durable product data.

4. **MinIO**
   - Uploaded sources when browser upload is used.
   - Extracted audio, transcript documents, proxies, thumbnails, previews, final renders, subtitle exports, and archives.
   - Persistent named volume.

5. **Temporal development service**
   - Durable workflow/activity history, retries, signals, cancellation, and restart recovery.
   - Persistent local state appropriate to a personal development deployment.

### Native macOS process

The Python Temporal worker runs outside Docker and connects to Temporal, Redis, MinIO, and authenticated Next.js internal endpoints. It owns:

- Source probing and fingerprint verification.
- FFmpeg/ffprobe child processes.
- MLX Whisper transcription.
- Transcript chunk preparation.
- OpenAI budget enforcement and Responses API calls.
- Face/subject tracking and crop-track generation.
- Preview and final rendering.
- Stage heartbeats, progress, ETA observations, and sanitized structured logs.

The worker writes media objects to MinIO and reports validated result references to Next.js. It never writes PostgreSQL directly.

### Local lifecycle

Repository-level task commands provide one documented startup and shutdown path even though the worker cannot run inside Docker on Apple Silicon. Startup validates required tools/configuration, starts Compose services, waits for health checks, then launches the native worker with signal forwarding. Shutdown stops the worker cleanly before stopping Compose. The underlying Compose and worker commands remain independently callable for debugging.

## 9. Source Input

Every new project offers two source methods.

### 9.1 Local filepath reference (default)

- User enters an absolute macOS filepath.
- Native worker resolves the real path and verifies it is a regular readable file inside a configured allowed root.
- The source is opened read-only and never modified or copied to MinIO.
- PostgreSQL stores the display path, resolved path, source kind, size, modification time, media probe, and lightweight fingerprint.
- The lightweight fingerprint combines stable file metadata with sampled content hashes. It avoids hashing an entire 10-GB file during normal validation.
- On later access, a missing or changed file pauses the workflow as `SOURCE_MISSING` or `SOURCE_CHANGED` and offers Relink Source.
- Relinking requires media compatibility and explicit user confirmation when the fingerprint differs.

### 9.2 Browser upload

- Browser sends resumable multipart parts directly to MinIO through short-lived presigned URLs.
- Next.js records upload-session state but does not proxy the 10-GB body.
- Completed upload is verified by object size and ffprobe before analysis begins.
- Interrupted uploads resume at incomplete parts.

### 9.3 Accepted sources

- Formats: MP4, MOV, MKV, and WebM.
- Maximum duration: 3 hours.
- Maximum size: 10 GB.
- The worker rejects unsupported or malformed media with an actionable error before paid analysis.

## 10. Project Modes

The New Project screen uses a clearly worded `Discover highlights with OpenAI` toggle.

### 10.1 AI Highlights (`AI_HIGHLIGHTS`)

- Local source validation, audio extraction, transcription, and transcript persistence.
- Preflight and verified OpenAI cost gates.
- OpenAI returns structured highlight candidates.
- Candidate previews and local reframe tracks are generated.
- Editor opens with AI candidates and supports additional manual clips.

### 10.2 Manual (`MANUAL`)

- Local source validation, audio extraction, and transcription still run.
- No OpenAI request is made.
- OpenAI usage and cost remain exactly zero.
- Editor opens with an empty filmstrip and Add Clip action.
- UI copy says “No cloud AI / no API cost,” because local Whisper and face tracking are still machine-learning models.

The mode is recorded on the project. A future analysis run may be started explicitly from an existing manual project using its persisted transcript; it is a new cost-gated analysis run, not a silent mode change.

## 11. Upload and Analysis Settings

For AI Highlights mode, the form includes:

- Source language selected from languages supported by the local transcription adapter.
- OpenAI model selector from the versioned compatible-model allowlist.
- Reasoning selector constrained by the selected model.
- Maximum OpenAI spend in USD.
- Maximum number of returned clips.
- Maximum clip length in seconds.
- Optional creative instruction, such as prioritizing surprising business advice.
- Platform-safe-area preview preset.

Defaults:

- Model: `gpt-5.6-sol`.
- Reasoning: high.
- Maximum clips: 5.
- Maximum clip length: 60 seconds.
- Platform: YouTube Shorts safe-area guide.

The maximum number is an upper bound; the model may return fewer candidates when the transcript does not support enough coherent clips. AI candidates target coherent segments of at least 15 seconds unless the available complete thought is shorter. Manual clips require `end > start` and may be shorter.

For Manual mode, model, reasoning, budget, and maximum-candidate controls are hidden. Language and maximum clip length remain available.

## 12. Local Transcription

- Audio is extracted locally to a normalized mono speech-analysis stream.
- The quality profile uses an Apple-optimized Whisper large-v3-equivalent model through MLX.
- The user-selected language is passed explicitly; automatic language detection is not the primary MVP flow.
- Output contains transcript text, segments, and word-level timestamps.
- Captions remain in the source language; no translation is performed.
- Transcript metadata records backend, model, model revision, language, runtime, word count, duration, and object reference.
- The complete timestamped transcript is stored as a versioned MinIO document. PostgreSQL stores metadata and references, not tens of thousands of word rows.

## 13. OpenAI Highlight Analysis and Cost Guard

### 13.1 Analysis purpose

OpenAI processes transcript text only. It scores potential clips for:

- Strength of opening hook.
- Standalone coherence without missing context.
- Clear payoff or useful conclusion.
- Novelty and specificity.
- Emotional or rhetorical energy.
- Fit to the optional user instruction.
- Boundary quality within the maximum duration.

It returns a schema-validated list containing start/end timestamps, title suggestion, rationale, rank, overall score, and scoring dimensions.

### 13.2 Quality-first staged analysis

The worker builds semantically coherent, overlapping transcript windows from sentence and silence boundaries. A quality-first run may use window-level candidate extraction followed by global ranking. The execution plan is finalized before any paid request so every planned request and allowed retry can be priced.

### 13.3 Preflight estimate

Before transcription, the application estimates transcript size from source duration and selected language. It combines:

- Estimated input tokens.
- Prompt/schema overhead.
- Maximum output/reasoning-token ceilings.
- Planned number of calls and budget-permitted retries.
- The selected model’s versioned input, cached-input, output, and long-context pricing rules.
- A 1.5× safety factor.

The UI shows the estimate, pricing snapshot date/version, expected full-video coverage, and an expected candidate range. It never states that a dollar amount guarantees a number of good clips.

### 13.4 Verified cost gate

After local transcription, the worker tokenizes the actual planned inputs and recalculates the safe maximum. OpenAI calls can begin only when:

```text
1.5 × worst_case_cost_of_remaining_planned_calls <= remaining_job_budget
```

If the check fails, Temporal enters `AWAITING_BUDGET`. The user can:

- Raise the cap.
- Choose a clearly disclosed contiguous source time range that fits the cap; the app never chooses a biased subset silently.
- Cancel with no OpenAI spend.

The application never switches models, reasoning effort, coverage, or retry count silently.

### 13.5 Actual usage

Each OpenAI response produces an immutable `AIUsageEvent` containing provider response ID, purpose, model ID, reasoning level, prompt/schema/pricing versions, token categories, applicable pricing tier, calculated cost, timestamps, and associated project/analysis/clip identifiers.

Shared analysis cost is allocated equally across generated candidates:

```text
allocated_candidate_cost = actual_shared_analysis_cost / generated_candidate_count
```

This value is labeled `allocated estimate` with method `equal_share`. Clip-specific model calls, if introduced for an explicit action, retain exact individual usage and cost.

The application-level cap does not inspect or control OpenAI usage from other applications on the same account.

## 14. Smart Vertical Reframing

- Default output canvas: 1080×1920 (9:16).
- A low-resolution proxy is analyzed for faces/subjects rather than processing every full-resolution frame.
- Tracks are temporally smoothed to prevent jitter.
- The selected target follows the dominant speaking subject when the heuristic is confident.
- When confidence is low or no face is detected, the system falls back to a stable center crop.
- Every clip exposes a manual focal-point override and crop preview.
- Crop-track metadata and algorithm version are stored for reproducibility.
- Analysis avoids changing the original source.

## 15. Captions and Styling

Caption content originates from the local word-timestamp transcript. The editor supports:

- Direct text correction.
- Font selection from an application-controlled local font set.
- Font size.
- Text, outline, background, and active-word colors.
- Vertical position constrained by platform safe areas.
- Maximum words per line.
- Active-word emphasis.
- Preview of YouTube Shorts, Instagram Reels, and TikTok safe-area guides.
- Optional short title text associated with the clip.

Advanced arbitrary text layers, custom animation keyframes, and multi-track compositing are excluded.

The browser preview uses the same normalized render specification as the final renderer. The worker compiles that specification to FFmpeg filters and ASS/libass subtitle data so preview and output stay close. Integration tests compare timing and layout invariants.

## 16. Manual Add Clip

Add Clip is available in both project modes.

1. User enters precise `HH:MM:SS.mmm` start and end values.
2. Client and server validate ordering, source bounds, and project maximum length.
3. Matching transcript words/cues are copied into the clip’s editable caption document.
4. The worker analyzes only the selected range for a local reframe track.
5. A preview is generated and the clip appears in the filmstrip.
6. The clip records origin `MANUAL`, no highlight score/rank, and `$0.00` OpenAI selection cost.

Creating or rendering a manual clip never invokes OpenAI.

## 17. Editor and Application UX

### Screen map

1. **Projects**
   - Persistent library until manual deletion.
   - Source health, mode, job state, progress, ETA, candidate/render counts, and total spend.

2. **New Project**
   - Upload/Filepath tabs.
   - AI Highlights toggle.
   - Language, model, reasoning, cap, clip limits, platform preset, and instruction.
   - Conservative preflight estimate before submission.

3. **Processing**
   - Stage timeline, percent, ETA range, worker health, sanitized logs, cancel, retry, and budget actions.

4. **Editor**
   - Left filmstrip for generated and manual clips.
   - Center vertical preview.
   - Persistent bottom trimming timeline.
   - Right inspector tabs for Captions, Frame, and Metadata.
   - Add Clip action.
   - Render selected / render all actions.

5. **Usage**
   - Sortable project, analysis-run, API-call, clip-allocation, render-timing, and model metadata.

6. **Settings**
   - Allowed local source roots.
   - Worker/model health and model-cache management.
   - Default platform/caption profile.
   - Versioned model/pricing catalog status.

### Visual direction

- Dark neutral editing workspace with mint primary accent.
- Video content remains the strongest visual element.
- Technical metadata is available but secondary.
- Model and estimated cost remain visible before paid analysis.
- Status never relies on color alone.
- Keyboard focus is always visible.
- Reduced-motion preference is honored.
- Keyboard trimming and form controls have accessible names and error relationships.

## 18. Rendering and Output

- Only accepted/selected clips are rendered at full resolution.
- Output: 1080×1920 H.264 video with AAC audio in MP4.
- Quality-first VideoToolbox settings are used when supported; a deterministic software encoder fallback is available.
- Source audio is clipped and muxed without cloud processing.
- Captions are burned in from the reviewed caption document.
- Platform preset affects safe-area validation, not the 9:16 resolution.
- Each clip renders independently. A failed render does not fail successful siblings.
- Every render stores an immutable snapshot of boundaries, crop track, caption document, style, encoder settings, media probes, timings, and object key.
- Completed clips can be downloaded individually as soon as they finish.
- Download All creates an archive of successful final MP4 files and optional SRT files.

## 19. Durable Data Model

### Core records

| Record | Responsibility |
|---|---|
| `Project` | Name, mode, language, defaults, status, current workflow IDs, totals, timestamps |
| `SourceAsset` | Source kind, safe display/resolved reference, fingerprint, size, probe, MinIO key if uploaded |
| `Transcript` | Backend/model/version, language, object key, duration, word count, timing metadata |
| `AnalysisRun` | Model/reasoning, prompt/schema/pricing versions, cap, safety factor, coverage, estimates, actual totals, status |
| `AIUsageEvent` | Exact provider call usage, response ID, token categories, pricing calculation, purpose |
| `Clip` | Origin, boundaries, analysis link, rank/scores, current caption/style/frame configuration, lifecycle state |
| `CostAllocation` | Equal-share allocated analysis cost linked to a clip and analysis run |
| `Render` | Immutable render input snapshot, output references, media metadata, status, timings, errors |
| `JobProjection` | Application-visible Temporal workflow/activity status and durable terminal result |
| `StageTimingObservation` | Hardware/backend/stage dimensions used for ETA learning |

Rich edit configuration and score breakdowns may use validated JSONB documents. Identity, relationships, state, money, and timestamps remain typed columns with constraints and indexes.

Money is stored as integer micro-USD or a fixed-precision PostgreSQL numeric; floating-point storage is forbidden. Timestamps are UTC. User-facing timezone formatting is separate.

### Store ownership

- **PostgreSQL:** durable application source of truth; Next.js/Prisma only.
- **MinIO:** durable media and large structured artifacts.
- **Redis:** rebuildable live projection and cache.
- **Temporal:** execution history, retry timers, wait conditions, signals, and cancellation.

## 20. Workflow States

Canonical project/job states include:

```text
DRAFT
VALIDATING_SOURCE
UPLOADING
QUEUED
PREPROCESSING
TRANSCRIBING
VERIFYING_BUDGET
AWAITING_BUDGET
ANALYZING
GENERATING_PREVIEWS
AWAITING_REVIEW
RENDERING
COMPLETED
FAILED
CANCELLED
SOURCE_MISSING
SOURCE_CHANGED
SOURCE_NOT_ALLOWED
RELINKING_SOURCE
```

Waiting states are not failures. They preserve artifacts and expose the exact user action required.

## 21. Progress and ETA

Analysis and rendering use separate progress scopes because review duration is controlled by the user.

Measured progress sources:

- Upload: completed bytes/parts.
- Audio extraction: media time processed.
- Transcription: audio seconds processed.
- Transcript analysis: completed windows and ranking stages.
- Subject tracking: processed proxy frames.
- Preview/render: encoded frames or media time.
- Multi-clip batches: completed items plus current item progress.

Temporal activity heartbeats carry raw progress. Redis stores the latest live snapshot and event stream. Next.js streams updates using server-sent events. Terminal timing observations are persisted to PostgreSQL.

ETA uses current throughput and hardware/backend-specific historical observations. The first run is low confidence. OpenAI stages display ranges because provider latency and reasoning duration vary. `AWAITING_BUDGET` and `AWAITING_REVIEW` have no ETA. Queued jobs derive a range from the active job and queue position.

The UI uses wording such as “estimated 8–12 minutes remaining,” never a guaranteed completion time.

## 22. Internal Contracts

- Cross-runtime payloads are versioned in `packages/contracts`.
- Schemas cover workflow inputs/results, progress events, worker health, media probes, transcripts, highlight responses, render specifications, cost data, and errors.
- TypeScript types and Python models are generated or validated from the same schemas.
- Contract generation is deterministic; CI fails on uncommitted generated diffs.
- Next.js internal worker endpoints require a service credential available only to the container and native worker.
- Internal endpoints accept idempotency keys and reject duplicate terminal result mutations.
- Large media and transcript payloads travel by MinIO object reference, never Temporal payload bodies or Redis values.

## 23. Failure Handling and Recovery

### Retryable failures

- Temporary MinIO, Redis, Temporal, Next.js internal API, OpenAI, or process I/O failures.
- Bounded exponential backoff with jitter.
- OpenAI retry is allowed only when its worst-case cost fits the remaining budget.
- Finished idempotent activity outputs are reused.

### Non-retryable failures

- Unsupported/malformed source.
- Path outside allowed roots.
- Invalid timecodes or render specification.
- Invalid provider credentials after a confirmed retry/refresh path.
- Structured provider response that remains invalid after the budget-permitted validation retry.

### Cancellation

- Temporal cancellation propagates to activities.
- FFmpeg and model subprocesses receive graceful termination followed by bounded forced termination.
- Completed durable artifacts remain available unless the user chooses cleanup.
- Incomplete multipart objects and temporary artifacts are cleaned by an idempotent cleanup activity.

### Independent clip failure

- A render batch records each clip result independently.
- Successful clips become downloadable even if another clip fails.
- Retry targets only the failed clip with the same immutable render snapshot unless the user edits it.

### Application restart

- Temporal resumes waiting/running workflows.
- Redis live projections are rebuilt from PostgreSQL and Temporal.
- Existing MinIO artifacts are probed and reused.
- Worker heartbeat loss shows `WORKER_OFFLINE`; jobs remain queued rather than being marked failed.

## 24. Privacy and Security

- Bind public application port to localhost by default.
- Do not add remote-access configuration to MVP Compose files.
- Validate every source against configured allowed roots after resolving symlinks.
- Pass FFmpeg arguments as arrays; never interpolate user input into a shell command.
- Sanitize filenames and object keys; use generated identifiers for storage.
- Use short-lived scoped MinIO presigned URLs.
- Store `OPENAI_API_KEY` only in the native worker environment.
- Never store API keys in PostgreSQL, Redis, MinIO, browser storage, Temporal payloads, logs, test fixtures, or Git.
- Redact transcript text and local paths from default logs and diagnostics.
- Project deletion cancels active workflows and removes database/MinIO artifacts. It never deletes a local filepath source.
- `.env` is ignored. `.env.example` contains names and nonsecret example values only.

## 25. PostgreSQL and Hosting Pivot

Local Compose uses environment variables such as:

```text
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=clip_factory
POSTGRES_USER=clip_factory
POSTGRES_PASSWORD=<local secret>
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
```

The actual secret is never committed.

Prisma migration rules:

- `prisma migrate dev` creates migrations only in developer workflows.
- Every generated SQL migration is reviewed and committed.
- CI applies the complete history to a fresh PostgreSQL instance.
- Production-like environments use `prisma migrate deploy`; Phase 1 CI does not connect to production.
- Schema design avoids hosted-provider-only extensions in MVP.

After MVP validation, moving to managed PostgreSQL consists of:

1. Provision managed PostgreSQL and TLS credentials.
2. Quiesce writes.
3. Export/import with PostgreSQL-native tooling.
4. Point the server-only `DATABASE_URL` at the managed host.
5. Run validated migration deployment.
6. Verify counts, constraints, and application health before switching traffic.

This does not by itself make the application multi-user or safely internet-facing; authentication, authorization, tenancy, hosted media processing, and local-file replacement require a separate design.

## 26. Git and Continuous Integration

Repository:

- GitHub: `Danangjoyoo/clip-factory`.
- Default branch: `master`.
- Local Git remote: `origin` over HTTPS.
- GitHub CLI is authenticated for repository and workflow operations.

### `ci.yml`

Triggers:

- Pull requests targeting `master`.
- Pushes to `master`.
- Manual dispatch.

Behavior:

- Least-privilege default workflow permissions.
- Concurrency group cancels stale runs for the same branch/PR.
- Pinned tool/runtime versions and locked dependencies.
- Dependency caches contain no credentials.
- Failure artifacts use short retention.

Jobs:

1. Web format, lint, typecheck, unit/component tests, and coverage.
2. Worker format/lint, typecheck, pytest, and coverage.
3. Contract generation and compatibility checks.
4. Prisma client generation, migration-history application, and schema validation against ephemeral PostgreSQL.
5. Integration suite with PostgreSQL, Redis, MinIO, and Temporal.
6. FFmpeg media integration using generated synthetic fixtures.
7. Playwright E2E using CPU/fake adapters for OpenAI, transcription, and YouTube.
8. Docker Compose configuration validation and reproducible application image builds.

### Security and dependency workflows

- CodeQL for JavaScript/TypeScript, Python, and GitHub Actions on PR/push plus a weekly schedule.
- Dependabot for pnpm, Python, Docker, and GitHub Actions dependencies, grouped to control noise.
- Official/third-party Actions pinned to immutable commit SHAs.
- No `pull_request_target` execution of untrusted repository code.

### Explicitly absent

- Continuous deployment.
- Registry or package publishing.
- GitHub release creation.
- Production database migrations.
- OpenAI, YouTube, or production infrastructure secrets.
- Real paid API calls.

After the first `master` push, `gh` may set the remote default branch and a ruleset requiring the agreed CI checks. Repository-setting mutations happen only with explicit implementation authorization.

## 27. Testing Strategy

Every behavior follows a witnessed red–green–refactor cycle. Production code is not written before the relevant test fails for the expected reason.

### TypeScript unit/component tests

- Timecode parsing and validation.
- Model/reasoning compatibility.
- Preflight/verified cost calculations including long-context tiers and 1.5× reserve.
- Equal-share cost allocation.
- Project/job state projection.
- ETA calculations and confidence.
- Upload mode and AI Highlights toggle behavior.
- Budget pause/resume UI.
- Add Clip and caption/style forms.
- Gallery/list and usage metadata views.

### Python unit tests

- Source path resolution, allowed roots, and fingerprints.
- Media command construction without shell interpolation.
- Transcript segment/cue selection.
- Window generation and highlight response validation.
- Budget-aware retry policy.
- Progress/ETA observation generation.
- Crop-track smoothing and fallback behavior.
- Render-spec compilation.
- Secret/log redaction.

### Contract and workflow tests

- TypeScript/Python schema compatibility.
- Temporal time-skipping tests for retries, cancellation, `AWAITING_BUDGET`, budget signals, source relinking, worker restart, and independent clip failure.
- Idempotent result callbacks and cleanup.

### Integration tests

- Real disposable PostgreSQL, Redis, MinIO, and Temporal.
- Complete Prisma migration history on a clean database.
- Multipart upload/resume.
- MinIO object lifecycle.
- Synthetic FFmpeg source through probe, trim, audio, caption burn-in, and output assertions.
- Final output assertions for duration, dimensions, streams, and codec/container invariants.

### Full-stack Playwright tests

- Browser upload and filepath reference.
- Manual Mode: transcribe fake, Add Clip, edit, render, download, and verify zero OpenAI usage.
- AI Highlights mode with deterministic fake Responses API usage.
- Budget pause and user-approved continuation.
- Progress/ETA display.
- Restart/reconnect behavior.
- Failed single render with successful sibling download.

### External smoke tests

Real OpenAI requests are opt-in, require explicit environment flags, use a small fixture and strict cap, and never run in default CI. User media is never a test fixture.

## 28. Observability

- Structured local logs include project, workflow, activity, clip, render, and error identifiers.
- Logs exclude secrets, full transcripts, media content, and raw local paths by default.
- Metrics include stage duration, media real-time factor, ETA error, retries, token/cost totals, render success, and queue delay.
- Health page covers Next.js, PostgreSQL, Redis, MinIO, Temporal, worker heartbeat, FFmpeg, local model availability, and OpenAI configuration presence.
- Diagnostics export is user-triggered and redacted. It excludes media, transcript text, local paths, API keys, and OAuth tokens.
- No telemetry leaves the machine in Phase 1.

## 29. Acceptance Criteria

On an Apple Silicon Mac:

1. A 30–60 minute talking-head source completes end-to-end without terminal intervention.
2. AI Highlights returns no more than the requested maximum candidates.
3. At least three generated candidates are considered postable after minor boundary/caption adjustments in the agreed acceptance sample.
4. A source up to 3 hours / 10 GB is accepted and processed without a fixed completion-time SLA.
5. Manual Mode and manually added clips record exactly `$0.00` OpenAI usage.
6. Raw video/audio stays local; OpenAI receives transcript text only.
7. A job cannot start an OpenAI request whose safety-adjusted worst-case cost exceeds the remaining cap.
8. Progress percentages are based on measured work; ETA is labeled as a range.
9. Restarting Docker services or the worker does not duplicate completed paid calls or completed renders.
10. A single failed render does not prevent successful clips from downloading.
11. Both input methods, all three platform safe-area presets, persistent projects, deletion, and relinking pass E2E tests.
12. All required CI checks pass on `master` with no real external API secrets or CD steps.

## 30. External References

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- [Prisma ORM](https://www.prisma.io/docs/orm)
- [Prisma Migrate](https://docs.prisma.io/docs/orm/prisma-migrate)
- [GitHub Actions billing and public-repository usage](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [MLX Whisper example](https://github.com/ml-explore/mlx-examples/tree/main/whisper)
