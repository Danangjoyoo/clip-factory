# Task 1: Shared theme system and studio application shell

**Files:**

- Create: `apps/web/src/modules/settings/delivery/ui/theme.ts`
- Create: `apps/web/src/modules/settings/delivery/ui/ThemeProvider.tsx`
- Create: `apps/web/src/modules/settings/delivery/ui/AppShell.tsx`
- Create: `apps/web/src/modules/settings/delivery/ui/AppShell.module.css`
- Create: `apps/web/src/modules/settings/delivery/ui/ThemeProvider.test.tsx`
- Modify: `apps/web/src/styles/tokens.css`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**

- Produces `ThemeId = 'tactile' | 'midnight' | 'signal'`, `ThemeProvider`, and `AppShell` for every UI route.
- Consumes `children: ReactNode` and optional `workerStatus: 'ready' | 'offline'`.
- Theme persistence key is exactly `clip-factory.theme`.

- [ ] **Step 1: Write failing theme tests**

```tsx
it('uses Midnight Signal when no saved theme exists', () => {
  render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
  expect(screen.getByText('midnight')).toBeInTheDocument();
});

it('persists a selected theme', async () => {
  render(<ThemeProvider><ThemeSelector /></ThemeProvider>);
  await userEvent.selectOptions(screen.getByLabelText('Theme'), 'signal');
  expect(localStorage.getItem('clip-factory.theme')).toBe('signal');
  expect(document.documentElement.dataset.theme).toBe('signal');
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/settings/delivery/ui/ThemeProvider.test.tsx`

Expected: FAIL because `ThemeProvider` and `ThemeSelector` do not exist.

- [ ] **Step 3: Implement the delivery-layer theme provider**

```ts
export const themeIds = ['tactile', 'midnight', 'signal'] as const;
export type ThemeId = (typeof themeIds)[number];
export const themeStorageKey = 'clip-factory.theme';
export const isThemeId = (value: string | null): value is ThemeId =>
  themeIds.includes(value as ThemeId);
```

Use client state in `ThemeProvider`. On mount, read `localStorage`, default to
`'midnight'`, set `document.documentElement.dataset.theme`, and write changes
back to `localStorage`. `AppShell` renders labelled native navigation links,
worker text status, and `<select aria-label="Theme">` using this provider.

- [ ] **Step 4: Replace global tokens and wrap the root layout**

Define `:root`, `[data-theme='tactile']`, `[data-theme='midnight']`, and
`[data-theme='signal']` values for canvas, surface, raised surface, text,
muted text, accent, accent contrast, warning, danger, focus, spacing, and
radii. Keep the existing system font stack. In `layout.tsx`, wrap `children`
with `ThemeProvider` and `AppShell`; do not add data fetching to the layout.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/settings/delivery/ui/ThemeProvider.test.tsx`

Expected: PASS.

Run: `pnpm --filter @clip-factory/web typecheck`

Expected: exit code 0.

```bash
git add apps/web/src/modules/settings/delivery/ui apps/web/src/styles apps/web/src/app/layout.tsx
git commit -m "feat: add themed Clip Factory studio shell"
```
