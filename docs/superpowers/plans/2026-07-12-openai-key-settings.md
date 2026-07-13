# OpenAI Key Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local OpenAI API key setup and disable AI-assisted mode until a key is configured.

**Architecture:** Reuse the existing settings API/store. Store the key locally, redact it on read, and let the Python worker read the same local file if `OPENAI_API_KEY` is absent.

**Tech Stack:** Next.js 16, React 19, TypeScript 7, Vitest, Python 3.12, pytest.

## Global Constraints

- Do not add dependencies.
- Do not return raw OpenAI API keys from HTTP GET.
- Keep the exact notice text: `OpenAI API KEY is missing, AI Assisted Mode is disabled`.
- Set coverage threshold to 80%.

---

### Task 1: Settings API and Store

**Files:**
- Modify: `apps/web/src/modules/settings/application/dto/entity/settings-entity.dto.ts`
- Modify: `apps/web/src/modules/settings/adapters/filesystem/local-settings-store.adapter.ts`
- Modify: `apps/web/src/modules/settings/delivery/http/settings.controller.ts`
- Test: `apps/web/src/modules/settings/delivery/http/settings.controller.test.ts`

**Interfaces:**
- Produces: `SettingsEntity.openAiApiKey?: string`
- Produces: settings GET response with `openAiApiKeyConfigured: boolean`

- [ ] Write failing controller tests for saving `openAiApiKey` and redacted GET.
- [ ] Run the controller test and confirm it fails.
- [ ] Add `openAiApiKey` to settings, merge/preserve it on save, and redact GET.
- [ ] Run the controller test and confirm it passes.

### Task 2: Settings Page and AI Mode Notice

**Files:**
- Modify: `apps/web/src/app/settings/page.tsx`
- Create: `apps/web/src/modules/settings/delivery/ui/SettingsOpenAIForm.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/AnalysisSettings.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/NewProjectPage.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/SourceValidationPanel.test.tsx`

**Interfaces:**
- Consumes: `openAiApiKeyConfigured: boolean`
- Produces: exact missing-key notice and disabled AI-assisted select options.

- [ ] Write failing UI test for missing-key notice and disabled non-manual modes.
- [ ] Run the UI test and confirm it fails.
- [ ] Add the settings key form and pass key configuration into project creation UI.
- [ ] Run the UI test and confirm it passes.

### Task 3: Worker Fallback and Coverage

**Files:**
- Modify: `apps/worker/src/clip_factory/composition/settings.py`
- Test: `apps/worker/tests/composition/test_settings.py`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `WorkerSettings.from_mapping()` reads `SETTINGS_FILE` JSON when `OPENAI_API_KEY` is absent.

- [ ] Write failing worker settings test for local settings fallback.
- [ ] Run the worker test and confirm it fails.
- [ ] Implement the fallback with Python stdlib JSON/path reading.
- [ ] Change coverage thresholds to 80.
- [ ] Run worker settings tests and coverage commands.

### Task 4: Verification

- [ ] Run `PATH="$PWD/.tools/bin:$PATH" pnpm verify`.
- [ ] Run `OPENAI_ADAPTER=fake pnpm test:integration-gate`.
- [ ] Run `RUN_INTEGRATION=1 node scripts/ci-integration.mjs -- pnpm test:integration`.
- [ ] Run `pnpm test:e2e`.
- [ ] Commit, push, update PR #17, and watch checks until active checks pass.
