# Clip Factory Phase 2 and UI Revision Execution Handover

## Purpose

Continue implementation from the current repository state in a new session. The user asked for Phase 2 YouTube publishing and UI revision execution to continue until green, but the latest instruction before this handover was:

> execute sequentially here, dont use subagent

Respect that unless the user explicitly changes it. Do not spawn subagents or start new worktrees by default.

## Current branch and workspace

- Repository: `/Users/mac/dev/projects/clipper/clip-factory`
- Active branch: `feature/phase-2-mvp`
- Shell convention: prefix commands with `rtk` per `AGENTS.md` and `/Users/mac/.codex/RTK.md`
- Ponytail mode is active: keep diffs small, reuse existing patterns, do not add speculative abstractions.
- Current tracked worktree is clean at handover time.
- Local untracked files/directories exist and should not be staged without user approval:
  - `.agents/`
  - `.windsurf/`
  - `skills-lock.json`

## Skills and process to load first

Use the relevant Superpowers skills before work:

- `superpowers:using-superpowers`
- `superpowers:executing-plans`
- `superpowers:test-driven-development`
- `superpowers:verification-before-completion`
- `superpowers:systematic-debugging` when any test or command fails

Do not use `superpowers:subagent-driven-development`, `superpowers:dispatching-parallel-agents`, or `cavecrew` unless the user explicitly re-authorizes subagents.

## Primary plans

- Phase 2: `docs/superpowers/plans/phase-2-youtube-publishing/master.md`
- UI revision: `docs/superpowers/plans/ui-revision/master.md`
- UI visual review artifacts: `docs/superpowers/plans/ui-revision/brainstorm/`

Important Phase 2 master memo already recorded:

- Phase 2 core/publishing prerequisites should land before YouTube dashboard UI wiring.
- User authorized deterministic-fake implementation before full Phase 1 acceptance, but this does not waive production OAuth/release gates.

## Mainline state already merged

Recent mainline top commits:

- `7d935ac4 test(youtube): guard architecture import paths`
- `ee489c65 test(youtube): defer integration repository loading`
- `fc533152 test(youtube): run connection suite from repository root`
- `9f4991c5 fix(youtube): keep stale events on requested connection`
- `b2b009bb feat(youtube): persist channel connection state`
- `926155a0 test(worker): isolate OAuth test helpers`
- `730d1ca3 fix(worker): reject unbound OAuth callback port`
- `8013404d feat(worker): define native YouTube OAuth security boundary`

Merged Phase 2 work:

- Task 1: token-free YouTube publishing contracts and boundary checks.
- Task 2: pure TypeScript publishing domain policy.
- Task 3: `YouTubeConnection` persistence, repository, data service, converters, and focused integration coverage.
- Task 6: native OAuth PKCE/state/scope/redaction policy and worker-owned ports.

Merged UI revision work:

- Tasks 1 through 5 are implemented and reviewed.
- Project intake/library real upload integration is wired, including multipart upload completion, checksums, public MinIO presign endpoint, CORS, streamed object checksum verification, and signed download URL handling.
- UI YouTube dashboard Tasks 6 and 7 are intentionally still constrained by Phase 2 backend prerequisites.

## Pending merge candidate: Phase 2 Task 4

Worktree: `.worktrees/phase2-task4`

Ready commits on `feature/phase2-task4`:

- `770fd040 feat(youtube): persist versioned metadata drafts`
- `d01f4760 test(youtube): prove metadata draft persistence`
- `98ca647e test(youtube): harden metadata draft constraints`
- `56266eb2 ci: run publishing integration tests`
- `21ff1fc6 ci: enable integration gate`

Task 4 adds:

- `PublishingMetadataDraft` Prisma model and migration.
- Record DTO, converter, repository, data service, composition wiring.
- Unit/data-service/converter coverage.
- Disposable PostgreSQL integration coverage for append-only versions, AI usage FK, stale revision, duplicates, missing FK, and negative money constraints.
- CI integration gate re-enabled with `RUN_INTEGRATION: '1'`.

Known Task 4 evidence from its worktree report:

- `RUN_INTEGRATION=1 pnpm exec vitest run tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts` passed 2/2 after Task 3 completed.
- `.github/workflows/ci.yml` parses with installed `yaml`.
- `git diff --check` passed in the Task 4 worktree.

Next agent should review and merge sequentially:

```bash
rtk git -C .worktrees/phase2-task4 status --short
rtk git -C .worktrees/phase2-task4 show --stat --oneline 926155a0..21ff1fc6
rtk git cherry-pick 770fd040 d01f4760 98ca647e 56266eb2 21ff1fc6
```

After cherry-pick, run focused checks from repository root:

```bash
rtk pnpm exec prisma generate
RUN_INTEGRATION=1 rtk pnpm exec vitest run --config vitest.workspace.ts --project integration tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts
rtk pnpm exec tsc --noEmit --project apps/web/tsconfig.json
rtk pnpm test:architecture
```

If local environment parsing complains about missing `MINIO_PUBLIC_ENDPOINT`, use only a non-secret local override for the command, for example `MINIO_PUBLIC_ENDPOINT=http://127.0.0.1:9000`.

## Next implementation task after Task 4 lands

Phase 2 Task 5 is next:

- Plan file: `docs/superpowers/plans/phase-2-youtube-publishing/task-5.md`
- Brief: `.superpowers/sdd/task-5-brief.md`
- Scope: `Publication` and `PublicationAttempt` persistence, active intent uniqueness, idempotency, progress constraints.
- Do not call Temporal or YouTube in Task 5.
- Task 5 depends on Tasks 1 and 2, and practically should run after Task 3 and Task 4 migrations are merged.

Start with RED tests for real database constraints:

```bash
rtk sed -n '1,220p' docs/superpowers/plans/phase-2-youtube-publishing/task-5.md
rtk sed -n '1,220p' .superpowers/sdd/task-5-brief.md
```

## Verification quirks

- Use local FFmpeg first for media tests:

```bash
PATH="$PWD/.tools/bin:$PATH" rtk pnpm test:media
```

- Root `pnpm verify` does not include media, E2E, compose, or full integration.
- Use direct web typecheck instead of filtered pnpm when clarity matters:

```bash
rtk pnpm exec tsc --noEmit --project apps/web/tsconfig.json
```

- Worker tests currently rely on `apps/worker/pyproject.toml` using `--import-mode=importlib`.
- `PATH="$PWD/.tools/bin:$PATH" rtk pnpm worker:test` previously passed 148 tests after OAuth helper isolation.
- Node local version may warn if not exactly `24.18.0`; do not treat a warning as a pass or fail without reading the exit code.

## Last known broad green evidence before Task 4 merge

- `PATH="$PWD/.tools/bin:$PATH" pnpm verify` passed after earlier Phase 1/UI hardening.
- `pnpm test:e2e` passed 9/9.
- `pnpm test:media` passed 1/1.
- After Phase 2 Task 3 merge, focused contract and architecture checks passed.
- After OAuth helper isolation, `PATH="$PWD/.tools/bin:$PATH" pnpm worker:test` passed 148 tests and worker mypy passed over source files.

Re-run broad checks after merging Task 4 and after each subsequent task. Do not claim all green based only on this historical evidence.

## Current risk list

- Task 4 generated Prisma client churn is large. Review carefully and regenerate from root after merge.
- UI revision Tasks 6 and 7 should wait until Phase 2 Tasks 8, 13, and 14 provide the needed backend/API/view-model surfaces.
- Publishing dashboard must not store OAuth token material in browser, PostgreSQL, Redis, MinIO, Docker, logs, Temporal payloads, fixtures, or Git.
- Manual clip creation and local rendering remain zero-OpenAI paths.
- Complete AI-assisted mode may recommend metadata/schedules but cannot upload or schedule without explicit user confirmation.

## Do not do

- Do not stage `.agents/`, `.windsurf/`, or `skills-lock.json` unless the user explicitly asks.
- Do not restore or rewrite user-owned env files without checking the current git state.
- Do not push or create PRs unless the user asks in the new session.
- Do not use Ruby. Use Python or shell for local verification scripts.
- Do not weaken Phase 1 boundaries to make Phase 2 easier.

## Suggested first message for next session

Continue from `docs/superpowers/handovers/2026-07-12-phase-2-ui-revision-execution-handover.md`. Work sequentially on `feature/phase-2-mvp`, no subagents unless I explicitly re-authorize them. First review and merge Phase 2 Task 4 from `.worktrees/phase2-task4`, run the focused checks in the handover, then proceed to Phase 2 Task 5 with TDD.
