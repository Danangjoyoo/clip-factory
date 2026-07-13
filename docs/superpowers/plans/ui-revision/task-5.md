# Task 5: Project settings side rail and scoped settings surfaces

**Files:**

- Create: `apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.test.tsx`
- Create: `apps/web/src/app/projects/[projectId]/settings/page.tsx`
- Modify: `apps/web/src/modules/projects/delivery/ui/project.presentation.ts`

**Interfaces:**

- `ProjectSettingsView` consumes `ProjectSettingsViewModel` with project title,
  instruction, source health/label, output-frame label, platform label,
  max-duration label, and caption-style label.
- Emits explicit callbacks: `onSaveGeneral`, `onRelinkSource`, `onSaveDefaults`,
  and `onDeleteProject`.

- [ ] **Step 1: Write failing tab and scope tests**

```tsx
it('shows only the selected settings section', async () => {
  render(<ProjectSettingsView value={settings} {...handlers} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Defaults' }));
  expect(screen.getByText('Defaults for new manual clips')).toBeInTheDocument();
  expect(screen.queryByText('Delete project')).not.toBeInTheDocument();
});

it('states that existing clips retain their edits', async () => {
  render(<ProjectSettingsView value={settings} {...handlers} />);
  await userEvent.click(screen.getByRole('tab', { name: 'Defaults' }));
  expect(screen.getByText(/Existing clips keep their own edits/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.test.tsx`

Expected: FAIL because `ProjectSettingsView` does not exist.

- [ ] **Step 3: Implement the stable project-settings side rail**

Use native tab semantics and `aria-selected`. Provide exactly four tabs:
General, Source, Defaults, and Danger zone. General edits title/instruction;
Source shows health and a relink action; Defaults describe that values apply to
new manual clips only; Danger zone explains local-only deletion and delegates
the confirmation/action to `onDeleteProject`.

- [ ] **Step 4: Add the route and visual styles**

Place the page at `/projects/[projectId]/settings`. Use a delivery-layer view
model created by the page/composition; do not allow CSS/React components to
query persistence directly. Keep global worker, theme, and YouTube account
settings out of this page.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/projects/delivery/ui/ProjectSettingsView.test.tsx`

Expected: PASS.

```bash
git add apps/web/src/modules/projects/delivery/ui apps/web/src/app/projects
git commit -m "feat: add project-scoped settings workspace"
```
