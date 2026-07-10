# Clip Factory Design Decision Log

**Date:** 2026-07-11

**Purpose:** Preserve the complete requirement discussion and approvals that produced the core and YouTube specifications.

## Approved Decisions

| # | Question or topic | Decision |
|---:|---|---|
| 1 | How much manual customization should the MVP provide? | Review and adjust clip boundaries, captions, title, and aspect framing before rendering. No full nonlinear timeline editor. |
| 2 | Who is the first version for? | Personal local-only user; no login. |
| 3 | Where should media and AI processing happen? | Video/audio stays local. Transcription is local. Only transcript text and optional creative instruction may go to the paid language model. |
| 4 | Use the visual brainstorming companion? | Yes. It was used for reframe, editor, workflow, data, OAuth, testing, database, and CI design views. |
| 5 | Default landscape-to-vertical treatment? | Smart subject-aware reframe with manual focal-point override. |
| 6 | Source limits? | Up to 3 hours / 10 GB; MP4, MOV, MKV, and WebM. |
| 7 | Language handling? | User selects any language supported by local Whisper; captions stay in the source language. No MVP translation. |
| 8 | Clip count and length? | User controls the upper-bound count and maximum duration; defaults are 5 clips and 60 seconds. AI chooses the best qualifying candidates and may return fewer. |
| 9 | First target machine? | Apple Silicon Mac with Docker Desktop. |
| 10 | Container boundary? | Next.js and infrastructure run in Docker Compose; the media worker runs natively on macOS for Apple acceleration. |
| 11 | Why does CPU matter? | FFmpeg decoding/encoding, transcription, frame analysis, and long sources are compute-heavy. The quality profile is preferred over speed. |
| 12 | Model provider? | OpenRouter was replaced with the OpenAI API because the user has an OpenAI key and active credits. |
| 13 | Privacy after provider change? | OpenAI receives transcript text only. Raw media remains local. |
| 14 | Default highlight model? | Quality-first `gpt-5.6-sol` with high reasoning, while preserving user-selectable compatible model/reasoning controls. |
| 15 | Primary editor layout? | Filmstrip on the left, vertical preview in the center, inspector on the right, persistent trim timeline below. |
| 16 | Project retention? | Persistent library until manual deletion. |
| 17 | Caption customization? | Edit text, font, size, colors, position, words per line, and active-word emphasis. Advanced arbitrary keyframes/layers excluded. |
| 18 | Primary content type? | Talking-head videos, interviews, and podcasts. |
| 19 | Export presets? | YouTube Shorts, Instagram Reels, and TikTok safe-area presets over 1080×1920 output. |
| 20 | Creative guidance? | Fixed quality rubric plus an optional user instruction. |
| 21 | MVP success bar? | A 30–60 minute sample completes without terminal intervention and yields at least three postable clips after minor edits; 3-hour/10-GB input is supported with no speed SLA. |
| 22 | Record Q&A? | Yes; this document is the complete decision record. |
| 23 | Architecture approach? | Hybrid monorepo: Next.js control plane plus native Python Temporal media worker. |
| 24 | Per-job cost limit? | Required. Upload form accepts a maximum OpenAI spend in USD. Estimate includes a 1.5× safety factor. |
| 25 | What happens when verified cost exceeds the cap? | Temporal pauses in `AWAITING_BUDGET`; user raises cap, chooses disclosed partial coverage, or cancels before spending. |
| 26 | Can budget guarantee a number of clips? | No. Most cost is transcript analysis; UI shows expected range/coverage, never a guaranteed clip count. |
| 27 | Upload controls? | Model selector, reasoning selector, maximum spend, maximum clips, and maximum seconds per clip. |
| 28 | Video-level provenance? | Store selected model/reasoning, prompt/schema/pricing versions, estimates, actual token categories/cost, coverage, response IDs, settings, and timestamps. |
| 29 | Clip-level provenance? | Store origin, analysis run, model/reasoning, prompt/pricing versions, rank/scores, timing, allocated shared cost, and exact clip-specific AI cost when applicable. |
| 30 | Shared analysis cost allocation? | Equal share across generated candidates, clearly labeled as an allocated estimate. |
| 31 | Progress and ETA? | Real percent from measured work plus an estimated time range. Confidence improves from historical local timings. Waiting-for-user states have no ETA. |
| 32 | YouTube URL as source? | Rejected. User will submit the video directly; no YouTube downloader is included. |
| 33 | Source submission methods? | Two methods: browser upload component and local filepath component. Local path is default and avoids copying the original. |
| 34 | Missing/changed path behavior? | Pause and offer Relink Source after validation; never modify/delete the local source. |
| 35 | Application visual direction? | Desktop-first dark editing studio with mint accent, accessible keyboard/focus behavior, visible cost/model metadata. |
| 36 | Manual Add Clip? | Available in both modes. User enters start/end time; app extracts local transcript cues, reframes, previews, and renders without OpenAI. |
| 37 | Two project modes? | `AI_HIGHLIGHTS` and `MANUAL`, controlled by a `Discover highlights with OpenAI` toggle. |
| 38 | Does Manual mode use no AI at all? | It uses local Whisper and face tracking, but no cloud AI and exactly `$0.00` OpenAI usage. UI wording must be accurate. |
| 39 | YouTube publishing possible? | Yes as Phase 2. Begin with private uploads and manual Studio review because unverified API projects cannot publish normally. |
| 40 | YouTube metadata? | Generate editable title, description, hashtags, and keyword tags with separately visible model/reasoning/cost provenance and explicit approval. |
| 41 | YouTube scheduling? | Each clip has an independent date/time/timezone. Upload private and delegate `publishAt` scheduling to YouTube after required verification. |
| 42 | YouTube workspace layout? | Project-level YouTube tab with user-switchable gallery/list views and per-clip publishing records. |
| 43 | YouTube thumbnails? | Generate/retain a cover asset, but clearly state that YouTube does not guarantee custom thumbnails for Shorts. |
| 44 | OAuth architecture? | Native desktop loopback flow using system browser, PKCE S256, one-time state, native token exchange, macOS Keychain refresh-token storage, and memory-only access tokens. |
| 45 | OAuth scopes? | First publishing version requests `youtube.upload` and `youtube.readonly`; broad `youtube.force-ssl` and separate caption-track management are deferred. |
| 46 | OAuth testing limitation? | Show that external OAuth apps in Testing have seven-day refresh-token expiry; support reconnect and `REAUTH_REQUIRED`. |
| 47 | Database owner? | Only Next.js writes the application database. Python reports through authenticated internal APIs. |
| 48 | Durable/ephemeral ownership? | PostgreSQL is product truth, MinIO owns media, Redis owns rebuildable live state/cache, Temporal owns workflow execution history. |
| 49 | Error recovery? | Retry transient failures within budget; pause for source/budget/user action; isolate clip failures; resume after process/service restarts. |
| 50 | TDD? | Strict witnessed red–green–refactor for every behavior. |
| 51 | External APIs in CI? | Deterministic fakes only by default. Real OpenAI/YouTube tests are explicit private smoke commands. |
| 52 | ORM? | Yes. Replace SQLite with stable Prisma ORM 7 and PostgreSQL from the first commit. |
| 53 | Why PostgreSQL now? | Moving local PostgreSQL to managed PostgreSQL later avoids a database-engine rewrite. Migration still requires controlled data export/import and verification. |
| 54 | Local DB credentials? | Host/port/database/user/password and `DATABASE_URL` come from ignored environment configuration; only nonsecret examples are committed. |
| 55 | Future hosted DB credentials? | Host secret manager and TLS connection URL; never browser-visible or committed. |
| 56 | Git remote/default branch? | Public `Danangjoyoo/clip-factory` repository with `master` as default branch. |
| 57 | GitHub connector unavailable? | Use authenticated GitHub CLI instead. Local `gh` has `repo` and `workflow` scopes. |
| 58 | CI platform? | Free standard GitHub-hosted Ubuntu runners for the public repository. |
| 59 | CI strength? | Web/worker quality, contracts, migrations, real infrastructure integration, synthetic media, Playwright E2E, Docker builds, CodeQL, and Dependabot. |
| 60 | Continuous deployment? | Explicitly excluded. No deploy, registry push, production migration, release, or production/external secrets in CI. |
| 61 | Code architecture and quality principles? | Clean Architecture, Clean Code, SOLID, and DRY are mandatory across TypeScript and Python. Dependency direction, boundary-specific DTOs/converters, narrow ports, layer ownership, cycles, and provider/framework leakage are enforced by tests, import rules, and CI before implementation is accepted. |
| 62 | Can a paid OpenAI call be retried automatically after an ambiguous timeout or worker crash? | No. The design does not rely on undocumented provider idempotency. It durably reserves before sending, records received usage before validation retries, and enters `PAID_CALL_UNCERTAIN` after an ambiguous post-transmission outcome. A fresh attempt requires explicit authorization and a new reservation with possible prior spend disclosed. |
| 63 | Can YouTube upload be exactly-once if the final resumable response/video ID is lost? | Not honestly. Local idempotency prevents duplicate intents, but the app cannot prove that YouTube created no video. After final-chunk dispatch, a lost result or later `404` enters `UPLOAD_OUTCOME_UNCERTAIN`; replacement requires channel reconciliation and explicit duplicate-risk acknowledgement. |

## Superseded or Clarified Ideas

- **OpenRouter:** Replaced by the OpenAI API before implementation.
- **SQLite:** Replaced by PostgreSQL + Prisma 7 after the hosting-pivot assessment.
- **“No AI” Manual mode wording:** Clarified to “No cloud AI / no API cost” because transcription and tracking remain local ML.
- **YouTube source URL:** Considered and rejected due official/reliability/rights constraints; direct source submission remains the product boundary.
- **Per-clip exact shared cost:** Provider usage is reported per response, so shared highlight-analysis cost is an equal-share allocated estimate. Clip-specific calls remain exact.
- **YouTube custom Shorts thumbnail:** A cover asset may be generated, but the product cannot promise custom Shorts thumbnail behavior.

## Design Approval Record

The user explicitly approved:

- Hybrid architecture and spending guard.
- Upload-to-download workflow and both source methods.
- UI/UX direction and two project modes.
- Manual Add Clip behavior.
- Phase 2 YouTube workspace and independent schedules.
- Persistent data ownership and recovery.
- Native YouTube OAuth security flow.
- Testing and observability strategy.
- PostgreSQL/Prisma revision and GitHub CI design.
- Mandatory Clean Architecture, Clean Code, SOLID, and DRY enforcement before implementation planning.
