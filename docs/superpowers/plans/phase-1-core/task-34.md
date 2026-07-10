# Task 34: Playwright Core Input, Manual, Editor, Download, Delete, and Relink Journeys

> **For agentic workers:** Use use-playwright-mcp-ui-dev and superpowers:test-driven-development. Prefer roles/labels, condition-based waits, console/network assertions, and desktop/narrow screenshots.

## Purpose and traceability

Cover design §27 and acceptance criteria 5, 8, 10–12: both inputs, Manual zero cost, Add Clip/edit/render/download, presets, progress, deletion, relink, persistent reconnect, accessibility smoke.

## Boundaries and files

- Requires Tasks 24–33.
- Create: `playwright.config.ts`
- Create: `tests/e2e/fixtures/app.ts`
- Create: `tests/e2e/fixtures/fake-adapter-seeds.ts`
- Test: `tests/e2e/manual-filepath.spec.ts`
- Test: `tests/e2e/browser-upload.spec.ts`
- Test: `tests/e2e/delete-relink.spec.ts`
- Test: `tests/e2e/responsive-accessibility.spec.ts`
- Create: `tests/e2e/responsive-accessibility.spec.ts-snapshots/projects-narrow-chromium-linux.png`
- Create: `tests/e2e/responsive-accessibility.spec.ts-snapshots/processing-narrow-chromium-linux.png`
- Create: `tests/e2e/responsive-accessibility.spec.ts-snapshots/editor-desktop-chromium-linux.png`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Pin `@axe-core/playwright` to `4.12.1` without a range.
- Web server starts CPU/fake adapters; no paid API/key/network is available.

## RED → GREEN → REFACTOR

- [ ] **RED: write the complete manual filepath journey.**

```ts
test('manual filepath transcribes, adds, edits, renders, and downloads with zero OpenAI usage', async ({ page, app }) => {
  await app.seedLocalSource('talking-head.mp4');
  await page.goto('/projects/new');
  await page.getByLabel('Project name').fill('Manual interview');
  await page.getByLabel('Absolute filepath').fill(app.localSourcePath('talking-head.mp4'));
  await page.getByRole('checkbox', { name:'Discover highlights with OpenAI' }).uncheck();
  await expect(page.getByText('No cloud AI / no API cost')).toBeVisible();
  await page.getByRole('button', { name:'Create project' }).click();
  await expect(page.getByText('Awaiting review')).toBeVisible();
  await page.getByRole('link', { name:'Open editor' }).click();
  await page.getByRole('button', { name:'Add clip' }).click();
  await page.getByLabel('Start').fill('00:00:01.000');
  await page.getByLabel('End').fill('00:00:06.000');
  await page.getByRole('button', { name:'Add clip' }).click();
  await page.getByRole('tab', { name:'Captions' }).click();
  await page.getByLabel('Caption word 1').fill('Corrected');
  await page.getByRole('button', { name:'Save changes' }).click();
  await page.getByRole('button', { name:'Render selected' }).click();
  await expect(page.getByRole('link', { name:'Download MP4' })).toBeVisible();
  await expect(page.getByText('$0.00 OpenAI selection cost')).toBeVisible();
  expect(await app.openAIUsageCount()).toBe(0);
});
```

- [ ] Run `pnpm test:e2e -- manual-filepath.spec.ts`; expect FAIL at first absent fixture/locator.

- [ ] **GREEN:** add only seed fixture/routes/locators needed for this journey; wait on workflow/SSE conditions, never `waitForTimeout`. Capture console errors, failed requests, and download; ffprobe downloaded file through app fixture.

- [ ] Run manual journey; expect PASS.

- [ ] **RED/GREEN browser upload:** interrupt after part 1, reload, assert resume uploads remaining parts, completes probe, Manual editor path, no body through Next.js by request-size audit.

- [ ] **RED/GREEN delete/relink:** missing local source shows `SOURCE_MISSING`, relink changed compatible source requires fingerprint confirmation, all three presets overlay and persist, project survives browser restart, deletion removes DB/MinIO but source file remains byte-identical.

- [ ] **RED/GREEN responsive/accessibility:** Chromium 1440×1000 editor screenshot and 390×844 Projects/Processing screenshots; tab through controls with visible focus; run axe serious/critical zero; reduced-motion media emulation; assert no horizontal document overflow.

- [ ] **REFACTOR:** shared fixture resets project-scoped data, preserves failure traces/screenshots/video, and asserts zero console errors/failed same-origin requests after every test.

## Verification and commit

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e -- manual-filepath.spec.ts browser-upload.spec.ts delete-relink.spec.ts responsive-accessibility.spec.ts
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: both source paths and full Manual path work, all presets/delete/relink persist, and zero OpenAI usage is durable.

**Suggested commit:** `test: cover core browser journeys`
