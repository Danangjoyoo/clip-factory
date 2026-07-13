# Local Workflow Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local Clip Factory usable end to end in Manual mode: create project from upload or filepath, process it with the real transcription engine, open editor, download transcript, add a manual clip, and download the result.

**Architecture:** Keep Temporal/worker contracts intact. Add a small web-owned local workflow runner for dev/test that writes existing Prisma project, transcript, render, and job projection records. Pages read those records through composition functions and render existing UI components.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest, Playwright through `scripts/integration-test.js`.

---

### Task 1: RED Tests

- [ ] Add unit tests for workflow engine stage order and idempotent completion.
- [ ] Add UI tests for processing auto-run redirect.
- [ ] Add UI tests for editor Clip editor / Transcript tabs and transcript download.
- [ ] Add UI tests proving manual mode hides budget, max clips, language, and clip duration controls.
- [ ] Update `tests/integration/integration-test.test.mjs` so the gate expects workflow, editor, transcript, and download checks.
- [ ] Run focused tests and confirm failures are for missing behavior.

### Task 2: Workflow Runner

- [ ] Add `RunProjectWorkflowService` with explicit stages: validate source, transcribe with MLX Whisper, prepare editor, render local manual results, complete.
- [ ] Add Prisma composition for the service. It must be idempotent and must not use fake OpenAI.
- [ ] Add `POST /api/projects/[projectId]/workflow`.
- [ ] Persist transcript metadata, completed render rows, project status, and job projection status.

### Task 3: Processing and Editor UI

- [ ] Replace static processing page with a client wrapper that starts the workflow and redirects to editor on completion.
- [ ] Make editor page project-aware by loading persisted clips and transcript view data.
- [ ] Add Clip editor / Transcript tabs and transcript download link.
- [ ] Add transcript download API.
- [ ] Make local results page project-aware and expose MP4 download links.
- [ ] Add local MP4 download API.

### Task 4: Intake UI

- [ ] Hide AI-only controls when mode is Manual.
- [ ] Keep hidden defaults in submitted payload so existing API validation still passes.

### Task 5: Integration Gate

- [ ] Update `scripts/integration-test.js` to create Manual projects, run workflow API, verify editor transcript tabs, verify upload and filepath flows, add a manual clip, and download MP4.
- [ ] Ensure the integration gate never calls fake/test-control routes.

### Task 6: Verification and PR

- [ ] Run focused Vitest tests.
- [ ] Run `node --test tests/integration/integration-test.test.mjs`.
- [ ] Run `pnpm test:integration-gate`.
- [ ] Run `pnpm test:e2e`.
- [ ] Run `PATH="$PWD/.tools/bin:$PATH" pnpm verify`.
- [ ] Commit, push, create or update PR.
