# Task 35: Playwright AI, Budget, Restart, and Sibling-Failure Journeys

> **For agentic workers:** Use use-playwright-mcp-ui-dev and superpowers:test-driven-development. Fake Responses usage is deterministic; ambiguous-call simulation has two distinct crash windows.

## Purpose and traceability

Cover design §§13.4–13.6, 21, 23, and acceptance criteria 2, 7–10, 14: bounded candidates, verified pause, progress/reconnect, restart reuse, independent renders, and explicit uncertain-call recovery.

## Boundaries and files

- Requires Tasks 15–17, 23, 26, 29, and 31–34.
- Test: `tests/e2e/ai-highlights.spec.ts`
- Test: `tests/e2e/budget-pause.spec.ts`
- Test: `tests/e2e/restart-reconnect.spec.ts`
- Test: `tests/e2e/render-failure.spec.ts`
- Test: `tests/e2e/paid-call-uncertain.spec.ts`
- Create: `apps/web/src/app/api/test-control/route.ts`
- Create: `apps/web/src/infrastructure/testing/fake-control.ts`
- Test: `apps/web/src/infrastructure/testing/fake-control.test.ts`
- Production builds exclude fake control route via server-only env guard and architecture test.

## RED → GREEN → REFACTOR

- [ ] **RED: AI bounded candidate and usage journey.** Create AI project max 3, fake returns 5, assert editor has 3 ranked candidates, exact response usage/cost in Usage, allocation labels, request body audit contains transcript/instruction but no media/path, model high and pricing versions visible.

- [ ] Run `pnpm test:e2e -- ai-highlights.spec.ts`; expect FAIL until fake controls and UI behavior are wired.

- [ ] **GREEN:** fake returns fixed response ID/token details and records sanitized request envelope; test helper queries audit endpoint. Application truncates after ranking and persists exact/allocated provenance.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm test:e2e -- ai-highlights.spec.ts budget-pause.spec.ts restart-reconnect.spec.ts render-failure.spec.ts paid-call-uncertain.spec.ts
# Expected: PASS
```

- [ ] **RED/GREEN verified budget:** fake tokenizer makes verified reserve exceed cap; assert `AWAITING_BUDGET`, no provider call, no ETA; choose explicit contiguous range, server shows coverage, fresh verification fits, one provider call starts. Separate cap raise and cancel cases.

- [ ] **RED/GREEN restart:** pause worker during transcription, restart, reconnect SSE with Last-Event-ID, completed audio/transcript activity counts remain one; restart Compose during review, workflow remains open and accepts render signal; completed render is not duplicated.

- [ ] **RED/GREEN sibling failure:** render three clips with second fake failure; first/third Download visible, second Retry visible, archive has only two; retry uses same snapshot and succeeds.

- [ ] **RED: exact uncertain-call tests.**

```ts
test('lost callback acknowledgement reconciles one recorded paid call', async ({ page, app }) => {
  await app.configurePaidCallCrash('AFTER_CALLBACK_COMMIT_BEFORE_ACK');
  const project = await app.createAiProject();
  await expect(page.getByText('Paid call outcome uncertain')).toBeVisible();
  expect(await app.projectState(project.id)).toBe('PAID_CALL_UNCERTAIN');
  await page.getByLabel('I understand the previous attempt may have incurred a separate charge').check();
  await page.getByRole('button', { name:'Reserve and retry' }).click();
  await expect(page.getByText('Analyzing transcript')).toBeVisible();
  expect(await app.providerCallCount(project.id)).toBe(1);
});

test('missing durable response requires explicit fresh reservation', async ({ page, app }) => {
  await app.configurePaidCallCrash('AFTER_SEND_BEFORE_DURABLE_RESPONSE');
  const project = await app.createAiProject();
  await app.restartWorker();
  await expect(page.getByText('No automatic retry will occur.')).toBeVisible();
  expect(await app.projectState(project.id)).toBe('PAID_CALL_UNCERTAIN');
  expect(await app.providerCallCount(project.id)).toBe(1);
  await page.getByLabel('I understand the previous attempt may have incurred a separate charge').check();
  await page.getByRole('button', { name:'Reserve and retry' }).click();
  await expect.poll(() => app.providerCallCount(project.id)).toBe(2);
  expect(await app.freshReservationCount(project.id)).toBe(1);
});
```

- [ ] **GREEN:** first crash mode commits Task 16 and drops HTTP acknowledgement; reconciliation retrieves recorded artifact and makes no call/reservation. Second marks reservation uncertain without artifact; UI shows possible separate spend, acknowledgement triggers server-calculated fresh reserve then second call.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm test:e2e -- ai-highlights.spec.ts budget-pause.spec.ts restart-reconnect.spec.ts render-failure.spec.ts paid-call-uncertain.spec.ts
# Expected: PASS
```

- [ ] **REFACTOR:** assert all tests have no external requests, no API key, no fixed sleeps, clean console/network, and failure trace retention.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm test:e2e -- ai-highlights.spec.ts budget-pause.spec.ts restart-reconnect.spec.ts render-failure.spec.ts paid-call-uncertain.spec.ts
# Expected: PASS
```

## Verification and commit

```bash
pnpm test:e2e -- ai-highlights.spec.ts budget-pause.spec.ts restart-reconnect.spec.ts render-failure.spec.ts paid-call-uncertain.spec.ts
pnpm test:integration
git diff --check
```

Expected: AI behavior is bounded/costed and both ambiguous crash windows obey conservative reconciliation/user authorization.

**Suggested commit:** `test: cover ai budget and recovery journeys`
