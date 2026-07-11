# Fake-Mode Local Integration Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fake-only local integration runner and comprehensive tests for the supplied sample video.

**Architecture:** Keep the runner as a thin Node CLI that shells only to Docker Compose health checks and calls public HTTP endpoints. Put pure validation/redaction helpers in the same module and test them without services; the live gate remains an explicit integration command.

**Tech Stack:** Node.js 24, built-in `node:test`, Docker Compose, existing Next.js API, existing Vitest/Playwright/integration contracts.

## Global Constraints

- Default and required provider mode is `OPENAI_ADAPTER=fake`.
- Reject `OPENAI_ADAPTER=live` before any network request.
- Use `/Users/mac/dev/projects/clipper/clip-factory/samples/what-is-branding.mp4` by default.
- Do not copy or mutate the source media.
- Do not print API keys, absolute source paths, or transcript text.

### Task 1: Integration runner and unit gate

**Files:**
- Create: `scripts/integration-test.js`
- Create: `tests/integration/integration-test.test.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Write failing unit tests for fake-mode enforcement, sample validation, redacted reports, and terminal-state failure.
- [ ] Run `node --test tests/integration/integration-test.test.mjs` and verify the expected failures.
- [ ] Implement the minimal runner and pure helpers.
- [ ] Run the unit tests until green.
- [ ] Run the live fake-mode gate against Compose and the supplied sample.
- [ ] Commit with `test: add fake-mode local integration gate`.
