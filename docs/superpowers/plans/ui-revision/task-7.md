# Task 7: Cross-journey integration, accessibility, responsive, and regression verification

**Files:**

- Create: `apps/web/src/app/ui-journey.test.tsx`
- Modify: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/src/modules/clips/delivery/ui/EditorShell.test.tsx`
- Modify: `README.md`

**Interfaces:**

- Verifies route-level shell composition and labels only; API/worker behavior
  stays covered by owning module tests.
- Produces README notes for theme selection, local downloads, manual clips, and
  the YouTube native OAuth prerequisite.

- [ ] **Step 1: Write failing route-journey tests**

```tsx
it('keeps shared studio navigation on projects, processing, editor, and settings', () => {
  for (const screen of [<ProjectsPage />, <ProcessingPage params={Promise.resolve({ projectId: 'p1' })} />, <EditorPage />, <ProjectSettingsPage />]) {
    render(screen);
    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
  }
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/app/ui-journey.test.tsx`

Expected: FAIL until the shared shell and pages are wired consistently.

- [ ] **Step 3: Add focused accessibility and responsive assertions**

Assert labelled native selects, keyboard filmstrip buttons, visible text for
status/processing, disabled render only for an updating clip, and drawer tabs
with correct `aria-selected`. Use CSS media-query assertions through rendered
class semantics only; do not test CSS implementation details.

- [ ] **Step 4: Update README usage**

Document these concrete flows: select a theme; create a titled project; choose
an AI-assisted mode; create a manual clip from source timecodes after
transcription; download rendered MP4/ZIP locally; and connect YouTube through
the native/system-browser OAuth flow. State that MVP output is 1080×1920 and
that schedules/uploads require confirmation.

- [ ] **Step 5: Run the full green gate and commit**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:architecture
pnpm test:contracts
```

Expected: every command exits 0.

```bash
git add apps/web/src README.md
git commit -m "test: verify end-to-end studio UI journey"
```
