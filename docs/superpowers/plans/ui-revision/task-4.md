# Task 4: Editor workspace, inspector, manual clips, and clip-local update states

**Files:**

- Modify: `apps/web/src/modules/clips/delivery/ui/EditorShell.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/EditorShell.module.css`
- Modify: `apps/web/src/modules/clips/delivery/ui/ClipFilmstrip.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/ClipFilmstrip.module.css`
- Modify: `apps/web/src/modules/clips/delivery/ui/AddClipDialog.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/FrameInspector.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/MetadataInspector.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/ClipUpdateOverlay.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/ClipUpdateOverlay.test.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/EditorShell.test.tsx`

**Interfaces:**

- Extend the delivery view with `previewState: 'READY' | 'UPDATING' | 'FAILED'` and optional `previewPercent`/`previewEtaLabel`.
- `AddClipDialog.onAdd` uses source timecode values converted to the existing millisecond callback signature.
- Existing `AddManualClipService` remains the authoritative validator and transcript-caption creator.

- [ ] **Step 1: Write failing editor interaction tests**

```tsx
it('allows selecting a ready filmstrip clip while the current clip updates', async () => {
  render(<EditorShell clips={[updatingClip, readyClip]} selectedClipId={updatingClip.id} {...handlers} />);
  await userEvent.click(screen.getByRole('button', { name: /ready clip/i }));
  expect(handlers.onSelect).toHaveBeenCalledWith(readyClip.id);
});

it('submits manual source timecodes as milliseconds', async () => {
  render(<AddClipDialog open onCancel={vi.fn()} onAdd={onAdd} />);
  await userEvent.type(screen.getByLabelText('Start timecode'), '00:32:14');
  await userEvent.type(screen.getByLabelText('End timecode'), '00:33:02');
  await userEvent.click(screen.getByRole('button', { name: 'Add clip' }));
  expect(onAdd).toHaveBeenCalledWith(1_934_000, 1_982_000);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/clips/delivery/ui/EditorShell.test.tsx apps/web/src/modules/clips/delivery/ui/ClipUpdateOverlay.test.tsx`

Expected: FAIL because preview state and timecode inputs do not exist.

- [ ] **Step 3: Implement the editor geometry and inspector content**

At desktop, use the approved filmstrip / vertical-preview-plus-timeline /
inspector grid. At narrow widths, stack selected clip, preview, timeline,
inspector, and actions. Display project output frame `9:16 · 1080×1920` beside
the selected source range. Frame tab exposes reframe/focal-point controls;
metadata tab is read-only provenance and includes model, reasoning, cost,
score, range, language, and inherited frame.

- [ ] **Step 4: Implement manual clips and local updating**

Use labelled `Start timecode` and `End timecode` fields with `HH:MM:SS` values.
Show range/max-duration feedback and `Captions ready from existing transcript`.
For an updating selected clip, render `ClipUpdateOverlay` with progress and ETA,
disable only that clip's render action, label it `Updating` in the filmstrip,
and retain enabled buttons for ready clips.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/clips/delivery/ui`

Expected: PASS.

```bash
git add apps/web/src/modules/clips/delivery/ui
git commit -m "feat: revise clip editor and manual editing flow"
```
