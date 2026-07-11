# Task 26: Processing UI, Budget Actions, and Uncertain Paid Calls

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. Waiting states must expose exact user action and no ETA.

## Purpose and traceability

Implement Processing screen from design §§13.4, 13.6, 17, 20–21, and 23: stage/progress/ETA, worker health/logs, reconnect, cancel/retry, budget actions, and explicit fresh-reservation authorization after an ambiguous paid call.

## Boundaries and files

- Requires Tasks 14, 17, and 24.
- Create: `apps/web/src/app/projects/[projectId]/processing/page.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.module.css`
- Create: `apps/web/src/modules/jobs/delivery/ui/StageTimeline.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/BudgetActions.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/UncertainPaidCallPanel.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/SanitizedLogList.tsx`
- Create: `apps/web/src/modules/jobs/delivery/ui/processing.presentation.ts`
- Create: `apps/web/src/modules/jobs/delivery/hooks/use-project-events.ts`
- Create: `apps/web/src/modules/jobs/delivery/http/job-actions-api.client.ts`
- Test: `apps/web/src/modules/jobs/delivery/ui/ProcessingView.test.tsx`
- Test: `apps/web/src/modules/jobs/delivery/ui/StageTimeline.test.tsx`
- Test: `apps/web/src/modules/jobs/delivery/ui/BudgetActions.test.tsx`
- Test: `apps/web/src/modules/jobs/delivery/ui/UncertainPaidCallPanel.test.tsx`
- Test: `apps/web/src/modules/jobs/delivery/ui/SanitizedLogList.test.tsx`
- Test: `apps/web/src/modules/jobs/delivery/hooks/use-project-events.test.tsx`
- Components receive `ProcessingPresentation`; they do not interpret workflow policy.

## RED → GREEN → REFACTOR

- [ ] **RED: running and waiting states.**

```tsx
it('shows measured progress and range while running', () => {
  render(<ProcessingView value={processingView({ state:'TRANSCRIBING', percent:42, eta:'Estimated 8–12 minutes remaining' })} actions={actions()} />);
  expect(screen.getByRole('progressbar', { name:'Transcribing progress' })).toHaveAttribute('aria-valuenow','42');
  expect(screen.getByText('Estimated 8–12 minutes remaining')).toBeVisible();
});
it.each(['AWAITING_BUDGET','PAID_CALL_UNCERTAIN','AWAITING_REVIEW'] as const)('shows no ETA in %s', (state) => {
  render(<ProcessingView value={processingView({ state, eta:null })} actions={actions()} />);
  expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
});
```

- [ ] Create a typed `ProcessingView` shell rendering only its heading, verify typecheck passes, then run the test; expect the named stage/progress/ETA assertion to FAIL because no stage content is rendered.

- [ ] **GREEN:** semantic ordered stage list includes text/icon status, progressbar only for measured running stage, ETA range when present, `Worker offline — job remains queued`, sanitized log disclosure, Cancel, and state-specific action panel. SSE hook sends `Last-Event-ID`, retries 1/2/4/8 seconds capped at 15, stops on abort, and fetches durable snapshot before reconnect.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/jobs/delivery/hooks
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui/ProcessingView.test.tsx`; expect PASS.

- [ ] **RED: budget actions.** Assert cap input previews new safe estimate, coverage requires explicit start/end and displays omitted range, Cancel says no OpenAI spend when no call occurred, and invalid action retains focus/error.

- [ ] **GREEN:** `BudgetActions` exposes exactly `Raise cap`, `Use a contiguous time range`, `Cancel analysis`; each POST includes current analysis version/idempotency key and disables only its own submission.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/jobs/delivery/hooks
# Expected: PASS
```

- [ ] **RED: ambiguous paid-call disclosure and authorization.**

```tsx
it('requires explicit acknowledgement and fresh reservation after an ambiguous paid call', async () => {
  const authorize = vi.fn();
  const user = userEvent.setup();
  render(<UncertainPaidCallPanel possibleSpend="$0.09 worst-case reserved" onAuthorize={authorize} onAbandon={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('OpenAI may have charged the previous attempt, but its actual usage is unknown. No automatic retry will occur.');
  expect(screen.getByText('$0.09 worst-case reserved')).toBeVisible();
  const retry = screen.getByRole('button', { name:'Reserve and retry' });
  expect(retry).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name:'I understand the previous attempt may have incurred a separate charge' }));
  await user.click(retry);
  expect(authorize).toHaveBeenCalledWith({ acknowledgePossiblePriorSpend:true });
});
```

- [ ] **GREEN:** render exact copy above, separate possible spend from Actual OpenAI spend, offer `Abandon analysis` and disabled-until-checked `Reserve and retry`. The API request cannot carry a caller-supplied reserve amount; server recalculates Task 14 and returns `AWAITING_BUDGET` if fresh reserve no longer fits.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/jobs/delivery/hooks
# Expected: PASS
```

- [ ] **REFACTOR:** visible focus, live announcements, reduced motion, long error wrapping, and keyboard-only action completion. Status never relies on color. `Finish project` signals Task 13 `complete_project`; until then `AWAITING_REVIEW` keeps the workflow open for Add Clip and render batches.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/jobs/delivery/hooks
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/jobs/delivery/ui apps/web/src/modules/jobs/delivery/hooks
pnpm --filter @clip-factory/web typecheck
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: all waiting states omit ETA; ambiguous paid outcome cannot retry without disclosure, checkbox acknowledgement, and server-created fresh reservation.

**Suggested commit:** `feat: add processing and paid-call recovery UI`
