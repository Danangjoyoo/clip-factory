# Task 3: Processing, local result dashboard, and download presentation

**Files:**

- Create: `apps/web/src/modules/clips/delivery/ui/ResultsDashboard.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/ResultsDashboard.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/ResultsDashboard.test.tsx`
- Modify: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.tsx`
- Modify: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.module.css`
- Modify: `apps/web/src/app/projects/[projectId]/processing/page.tsx`
- Create: `apps/web/src/app/projects/[projectId]/clips/page.tsx`

**Interfaces:**

- `ResultsDashboard` consumes a readonly list of `ResultClipView` with `id`,
  `title`, `durationLabel`, `state`, `originLabel`, `sizeLabel`, `formatLabel`,
  and optional `downloadHref`.
- A `RENDERED` clip exposes `Download MP4`; a non-terminal clip never exposes
  an enabled download action.

- [ ] **Step 1: Write failing results and processing tests**

```tsx
it('keeps a rendered download available while another clip renders', () => {
  render(<ResultsDashboard clips={[renderedClip, renderingClip]} onDownloadAll={vi.fn()} />);
  expect(screen.getByRole('link', { name: 'Download MP4: Ready clip' })).toHaveAttribute('href', renderedClip.downloadHref);
  expect(screen.getByRole('button', { name: 'Download MP4: Rendering clip' })).toBeDisabled();
});

it('explains the ETA source in the processing run sheet', () => {
  render(<ProcessingView value={runningProjection} />);
  expect(screen.getByText(/completed worker-stage timings/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/clips/delivery/ui/ResultsDashboard.test.tsx`

Expected: FAIL because `ResultsDashboard` does not exist.

- [ ] **Step 3: Implement the processing run sheet**

Keep `ProcessingView` as the owner of job projection display. Add semantic
regions for current stage, numeric percentage, ETA/ETA explanation, budget,
pause/resume/cancel controls, and sanitized logs. Use text labels alongside
accent colors. Do not change the SSE/job domain contract.

- [ ] **Step 4: Implement local result cards and route**

Render poster, duration, origin/score, file size, `MP4 · H.264 + AAC · captions
stitched`, editor action, and download action. Add a `Download all (.zip)`
action only when the supplied page action exists; do not fabricate archive URLs.
The page must remain independent from the YouTube tab.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/clips/delivery/ui/ResultsDashboard.test.tsx`

Expected: PASS.

```bash
git add apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/clips/delivery/ui apps/web/src/app/projects
git commit -m "feat: add processing run sheet and local results dashboard"
```
