# Task 27: Editor Filmstrip, Preview, Trim Timeline, and Render Actions

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. Keep server policy in hooks/services and local interactions in typed components.

## Purpose and traceability

Implement the primary editor structure from design §17: filmstrip left, vertical preview center, inspector right, persistent bottom trim timeline, Add Clip, render selected/all, and desktop-first responsive behavior.

## Boundaries and files

- Requires Tasks 20–24.
- Create: `apps/web/src/app/projects/[projectId]/editor/page.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/EditorShell.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/EditorShell.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/ClipFilmstrip.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/ClipFilmstrip.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/VerticalPreview.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/VerticalPreview.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/TrimTimeline.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/TrimTimeline.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/AddClipDialog.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/RenderActions.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/editor.presentation.ts`
- Create: `apps/web/src/modules/clips/delivery/ui/use-editor.ts`
- Create: `apps/web/src/modules/clips/delivery/http/clip-api.client.ts`
- Test: `apps/web/src/modules/clips/delivery/ui/EditorShell.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/ClipFilmstrip.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/VerticalPreview.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/TrimTimeline.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/AddClipDialog.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/RenderActions.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/use-editor.test.tsx`
- UI consumes clip presentations and callbacks; preview URL is short-lived and never persisted in browser storage.

## RED → GREEN → REFACTOR

- [ ] **RED: editor regions and selection.** Assert named navigation `Clips`, main `Preview`, complementary `Inspector`, region `Trim timeline`; selecting clip updates preview/title/metadata and preserves stable layout; empty filmstrip shows Add Clip.

- [ ] Create typed editor component shells with inert callbacks, verify typecheck passes, then run the test; expect the named filmstrip-selection assertion to FAIL because the shell renders no clips.

- [ ] **GREEN:** create `EditorShellProps {clips,selectedClipId,onSelect,onAddClip,onRenderSelected,onRenderAll,inspector}`. Use semantic regions and 3-column CSS grid `18rem minmax(22rem,1fr) 22rem` plus bottom row; below 1024 px, filmstrip becomes horizontal and inspector follows preview.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/EditorShell.test.tsx`; expect PASS.

- [ ] **RED: keyboard trimming.** ArrowLeft/Right moves active boundary ±10 ms, Shift ±100 ms, PageUp/Down ±1000 ms; start cannot meet/pass end or leave source; errors associate with inputs; direct timecode entry uses Task 19 parser.

```tsx
it('moves the selected end boundary by keyboard and emits one valid range', async () => {
  const change = vi.fn();
  const user = userEvent.setup();
  render(<TrimTimeline value={{startMs:1000,endMs:5000,sourceDurationMs:10000,maxDurationMs:60000}} activeBoundary="end" onChange={change} />);
  await user.type(screen.getByRole('slider', { name:'Clip end' }), '{ArrowLeft}');
  expect(change).toHaveBeenLastCalledWith({startMs:1000,endMs:4990});
});
```

- [ ] **GREEN:** native range inputs expose `aria-valuetext` formatted timecodes; reducer applies exact step/clamp and calls save only after 300 ms idle or blur. Server validation errors restore last persisted range.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui
# Expected: PASS
```

- [ ] **RED/GREEN Add Clip:** dialog has start/end labels, inline bounds/max errors, Cancel, Add; success selects new clip after preview state begins; API duplicate protection uses idempotency key. Copy never implies cloud analysis.

- [ ] **RED/GREEN render actions:** selected disabled without selection; all disabled without accepted clips; busy state names action; individual failure remains on failed clip while successful siblings expose Download.

- [ ] **REFACTOR:** filmstrip virtualizes only after 100 clips, preserves focus by clip ID, exposes origin/rank/status text, and uses `<video>` with captions label/mute controls and no autoplay sound.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui
pnpm --filter @clip-factory/web typecheck
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: editor hierarchy, precise keyboard trim, manual addition, and independent render actions work without infrastructure logic in components.

**Suggested commit:** `feat: add filmstrip editor and trim timeline`
