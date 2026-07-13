# UI Brainstorm Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current app pages visually follow the approved brainstorm artifacts in `docs/superpowers/plans/ui-revision/brainstorm`.

**Architecture:** Keep existing React components and routes. Apply the approved Midnight Signal studio language through shared tokens, shell polish, and focused CSS/content patches on each page surface.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, existing theme provider.

## Global Constraints

- UI-only pass. Do not touch transcription/model workflow behavior.
- No automated tests for this pass, per user request.
- Use existing CSS modules and tokens; do not add dependencies.
- Keep native controls and accessible labels.
- Match approved artifacts: compact studio shell, 18px shell radius, cyan accent, dense panels, project-scoped settings rail, editor workbench, rendered downloads.

---

### Task 1: Shared Studio Shell

**Files:**
- Modify: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/modules/settings/delivery/ui/AppShell.module.css`

- [x] Tighten Midnight Signal tokens to the brainstorm values.
- [x] Add global link/button/input text wrapping and stable body typography.
- [x] Make the top shell match the brainstorm bar: compact, cyan brand, worker pill, native theme select.

### Task 2: Project Library and Intake

**Files:**
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.module.css`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectCard.module.css`
- Modify: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.module.css`

- [x] Make library workspace match the approved two-column workbench.
- [x] Make project cards dense rows with thumbnail, source, status pill, and no exposed metric expansion.
- [x] Rename intake header copy to the approved source-intake wording.
- [x] Make Manual mode look intentional: keep AI-only controls hidden, show a manual-mode note in the analysis panel.

### Task 3: Processing, Editor, Downloads

**Files:**
- Modify: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.tsx`
- Modify: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.module.css`
- Modify: `apps/web/src/modules/clips/delivery/ui/EditorShell.module.css`
- Modify: `apps/web/src/modules/clips/delivery/ui/ResultsDashboard.module.css`

- [x] Align processing copy and panels with the approved run sheet.
- [x] Ensure editor fills the workbench with filmstrip, preview, timeline, inspector.
- [x] Make downloads look like rendered result cards with vertical posters.

### Task 4: Settings and Usage

**Files:**
- Modify: `apps/web/src/app/settings/SettingsPage.module.css`
- Modify: `apps/web/src/modules/settings/delivery/ui/SettingsOpenAIForm.module.css`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.module.css`
- Modify: `apps/web/src/modules/analysis/delivery/ui/UsageView.module.css`

- [x] Align global Settings with the side-rail panel pattern.
- [x] Align Project settings with the approved project-scoped rail and section panels.
- [x] Keep Usage in the same studio data-table language.

### Task 5: Static Review Only

**Files:**
- Review touched files with `git diff --check`.

- [x] Run no automated tests.
- [x] Do not claim tested status.
