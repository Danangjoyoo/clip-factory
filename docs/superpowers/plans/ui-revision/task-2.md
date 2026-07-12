# Task 2: Projects library, new-project intake, source recovery, and AI-assisted modes

**Files:**

- Create: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/SourceValidationPanel.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/SourceValidationPanel.test.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/use-new-project-form.ts`
- Modify: `apps/web/src/modules/projects/delivery/ui/new-project.presentation.ts`
- Modify: `apps/web/src/modules/projects/delivery/ui/AnalysisSettings.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.module.css`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectCard.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/ProjectCard.module.css`

**Interfaces:**

- Produces `AiAssistedMode = 'MANUAL' | 'PARTIAL' | 'ADVANCED' | 'COMPLETE'` as a delivery-layer selection.
- Maps `MANUAL` to existing `ProjectMode.MANUAL`; `PARTIAL` maps to existing `ProjectMode.AI_HIGHLIGHTS` until approved Phase 2 metadata/scheduling contracts are connected.
- `ADVANCED` and `COMPLETE` must show their additional publishing capabilities but must not trigger a paid call or upload from the intake form.

- [ ] **Step 1: Write failing mode and validation-recovery tests**

```tsx
it('keeps setup values when source validation fails', () => {
  render(<SourceValidationPanel title="What is branding?" error="SOURCE_NOT_FOUND" />);
  expect(screen.getByDisplayValue('What is branding?')).toBeInTheDocument();
  expect(screen.getByText('Replace source')).toBeInTheDocument();
});

it('describes Complete mode without promising automatic publication', () => {
  render(<AnalysisSettings mode="COMPLETE" {...handlers} />);
  expect(screen.getByText(/confirm every schedule and upload/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/projects/delivery/ui/SourceValidationPanel.test.tsx`

Expected: FAIL because the panel and mode prop do not exist.

- [ ] **Step 3: Implement form state and the two-column intake layout**

Add `name` to `FormValue` and bind it to the existing API-required project
name. Replace `discoverHighlights` UI with a native `AI-assisted mode` select.
Render exact copy:

```ts
const aiModeCopy = {
  MANUAL: 'No OpenAI calls. Clip selection, metadata, and publishing details are manual.',
  PARTIAL: 'AI suggests highlight candidates for clip editing. Captions and publishing stay manual.',
  ADVANCED: 'AI suggests highlights and drafts YouTube metadata for review.',
  COMPLETE: 'AI suggests highlights, metadata, and publishing times. You must still confirm every schedule and upload.',
} as const;
```

Use CSS module grid areas for project/source and analysis controls. Include a
read-only `Vertical 9:16 · 1080×1920` output-frame field, native form selects,
cost/reserve panel, and source-validation panel. The recovery panel blocks
submission only while its source is invalid and preserves all input state.

- [ ] **Step 4: Restyle projects as a workbench**

Use existing `ProjectCardView` fields. Each card must surface source health,
mode, progress, ETA, candidate/render counts, spend, and last update. Keep one
empty-state call to action: `Create your first project`.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/projects/delivery/ui`

Expected: PASS.

Run: `pnpm --filter @clip-factory/web lint`

Expected: exit code 0.

```bash
git add apps/web/src/modules/projects/delivery/ui
git commit -m "feat: revise project intake and library workspace"
```
