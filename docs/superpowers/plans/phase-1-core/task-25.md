# Task 25: New Project UI, Input Modes, and Preflight

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. Use native controls and role/label queries.

## Purpose and traceability

Implement design §§9–11 and 17: filepath default/upload tabs, truthful AI toggle, language, compatible model/reasoning, cap/limits/instruction/platform controls, defaults, and conservative estimate before submit.

## Boundaries and files

- Requires Tasks 3, 7, 9–10, and 14.
- Create: `apps/web/src/app/projects/new/page.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/SourceMethodFields.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/AnalysisSettings.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/new-project.presentation.ts`
- Create: `apps/web/src/modules/projects/delivery/ui/use-new-project-form.ts`
- Create: `apps/web/src/modules/projects/delivery/http/project-api.client.ts`
- Test: `apps/web/src/modules/projects/delivery/ui/NewProjectForm.test.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/SourceMethodFields.test.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/AnalysisSettings.test.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/use-new-project-form.test.tsx`
- Form uses API Schema DTO and converter at submit; no Entity/Record/SDK type enters component props.

## RED → GREEN → REFACTOR

- [ ] **RED: defaults and conditional controls.**

```tsx
it('defaults to filepath and high-reasoning AI highlights settings', () => {
  render(<NewProjectForm catalog={catalogView()} onEstimate={vi.fn()} onSubmit={vi.fn()} />);
  expect(screen.getByRole('tab', { name: 'Local filepath' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('checkbox', { name: 'Discover highlights with OpenAI' })).toBeChecked();
  expect(screen.getByLabelText('Model')).toHaveValue('gpt-5.6-sol');
  expect(screen.getByLabelText('Reasoning')).toHaveValue('high');
  expect(screen.getByLabelText('Maximum clips')).toHaveValue(5);
  expect(screen.getByLabelText('Maximum clip length (seconds)')).toHaveValue(60);
  expect(screen.getByLabelText('Platform guide')).toHaveValue('YOUTUBE_SHORTS');
});
it('hides paid controls and says truthful manual copy', async () => {
  const user = userEvent.setup();
  render(<NewProjectForm catalog={catalogView()} onEstimate={vi.fn()} onSubmit={vi.fn()} />);
  await user.click(screen.getByRole('checkbox', { name: 'Discover highlights with OpenAI' }));
  expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
  expect(screen.getByText('No cloud AI / no API cost')).toBeVisible();
  expect(screen.getByLabelText('Language')).toBeVisible();
  expect(screen.getByLabelText('Maximum clip length (seconds)')).toBeVisible();
});
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/projects/delivery/ui/NewProjectForm.test.tsx`; expect import FAIL.

- [ ] **GREEN:** create controlled state with exact defaults `{sourceMethod:'FILEPATH', discoverHighlights:true, language:'en', model:'gpt-5.6-sol', reasoning:'high', maximumSpendUsd:'5.00', maximumClips:5, maximumClipSeconds:60, instruction:'', platform:'YOUTUBE_SHORTS'}`. Render tablist/tabs/panels, absolute-path input or resumable upload picker, and conditionally render paid controls.

- [ ] Run conditional tests; expect PASS.

- [ ] **RED: model/reasoning catalog test.** Model selector lists `gpt-5.6-sol` then `gpt-5.5`; an access projection marks unavailable/unknown entries with text rather than color, disables unavailable options, and never changes the current selection automatically. `gpt-5.6-sol` lists `none, low, medium, high, xhigh, max`; `gpt-5.5` omits `max`; high remains the explicit app default. Show each profile's single generated-token ceiling, explain that it includes reasoning and visible output, and reject a value absent from the selected model.

- [ ] **GREEN:** map Task 3 catalog plus Task 15 sanitized model-access projection to `<option>` values. When the configured default is unavailable, keep it visibly selected with an error and require the user to choose `gpt-5.5`; do not silently fall back. Changing model selects its declared reasoning default only as part of that explicit user action and announces the change. An unknown access check or missing key disables AI project creation but leaves Manual mode available.

- [ ] **RED: preflight and validation behavior.** Invalid/nonabsolute path, unsupported extension, spend with more than two decimals/negative, count outside `1..50`, max seconds outside `1..10800`, and instruction over 2000 chars each show associated error. Valid AI input calls `onEstimate`, displays pricing version, `1.5× safety reserve`, full coverage, `$x.xx–$y.yy`, and `Expected candidates: 0–5 (not guaranteed)` before enabled Create.

- [ ] **GREEN:** debounce estimate 300 ms using injected scheduler, cancel stale requests with AbortController, render loading/error/retry, and require latest estimate hash in create request. Upload selection starts Task 9 multipart and shows bytes/parts resume; filepath sends no browser filesystem access.

- [ ] **REFACTOR:** every input has label/error `aria-describedby`; status announcements use polite live region; disabled controls remain dimensionally stable; submit moves focus to first invalid field or routes to Processing on 201.

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/projects/delivery/ui/NewProjectForm.test.tsx
pnpm --filter @clip-factory/web typecheck
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: Manual hides cloud controls, AI shows complete supported reasoning set and conservative non-guaranteed estimate, and upload/filepath requests stay distinct.

**Suggested commit:** `feat: add new project and cost preflight UI`
