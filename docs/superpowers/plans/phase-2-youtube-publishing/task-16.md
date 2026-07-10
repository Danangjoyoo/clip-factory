# Task 16: Phase 2 E2E, CI, Acceptance Evidence, and Optional Private Smoke

> **Implementation mode:** Complete after Tasks 1–15. Use `superpowers:verification-before-completion`; do not claim success from a subset of tests or from an optional real-provider smoke alone.

## Purpose

Prove the complete Phase 2 product through deterministic fake-provider Playwright/integration/security suites, extend existing public-repository CI without external secrets or deployment authority, produce target-Mac acceptance evidence for all fourteen criteria, and provide separately gated real OpenAI/YouTube private smoke commands that never run by default.

## Requirements and traceability

- YouTube design §17: unit/integration/Playwright/explicit real smoke matrix.
- YouTube design §18: all fourteen numbered acceptance criteria, including `PAID_CALL_UNCERTAIN` and `UPLOAD_OUTCOME_UNCERTAIN` recovery.
- Core design §§26–30: public Ubuntu CI, pinned actions, no paid API/CD, ≥90% coverage, Apple Silicon/local security evidence.
- Decision log 50–63: strict TDD, deterministic fakes, exact architecture, paid/upload ambiguity honesty.

## Clean Architecture ownership

- **No new feature policy:** this task exercises public ports/routes/UI and fixes failures at their owning task boundary with a focused RED test.
- **Default test adapters:** fake Google consent/token/channel, in-memory Keychain contract backend on Linux, fake OpenAI Responses, stateful fake YouTube, CPU/local media.
- **Target-Mac acceptance:** fake external providers plus the real macOS Keychain backend; no external credential is required.
- **Real smoke:** native adapters only, explicit environment authorization, private visibility, dedicated fixture/channel, no default CI reference.

## Files

- Create: `tests/e2e/youtube-publishing.spec.ts`
- Create: `tests/e2e/support/fake-youtube-control.ts`
- Create: `tests/e2e/support/browser-credential-scan.ts`
- Create: `tests/integration/youtube-publishing/full-phase-2.test.ts`
- Create: `tests/architecture/phase-2-ci-policy.test.mjs`
- Create: `tests/fixtures/acceptance/phase-2-manifest.json`
- Create: `tests/acceptance/phase-2-evidence-schema.test.mjs`
- Create: `scripts/acceptance/run-phase-2.mjs`
- Create: `scripts/acceptance/phase-2-privacy-audit.mjs`
- Create: `docs/acceptance/phase-2-checklist.md`
- Create: `docs/youtube-publishing-setup.md`
- Create: `apps/worker/tests/smoke/test_real_openai_metadata_generation.py`
- Create: `apps/worker/tests/smoke/test_real_youtube_private_upload.py`
- Modify: `apps/worker/pyproject.toml`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `playwright.config.ts`
- Modify: `.gitignore`
- Modify: `.env.example`

## Prerequisites

- Every focused command in Tasks 1–15 is green.
- Phase 1 `ci.yml`, CodeQL, Dependabot, integration overlay, Playwright fixture, and acceptance/privacy runner are accepted and extended rather than replaced.
- CI uses the finalized Phase 1 pins. For any touched setup-uv/CodeQL line use `astral-sh/setup-uv@11f9893b081a58869d3b5fccaea48c9e9e46f990` and `github/codeql-action/{init,analyze}@99df26d4f13ea111d4ec1a7dddef6063f76b97e9`; do not restore superseded pins.

## RED-GREEN-REFACTOR cycle 1: full deterministic Playwright workflows

- [ ] **RED 1.1 — Write connect/workspace/metadata tests first.**

Create `youtube-publishing.spec.ts` using Phase 1 authenticated localhost fixtures and role/name locators:

```ts
import { expect, test } from './support/fixtures';
import { scanBrowserCredentialSinks } from './support/browser-credential-scan';

test('connects, reconnects, disconnects, and keeps credentials outside the browser', async ({
  page,
  fakeProviders,
}) => {
  const canaries = await fakeProviders.createCredentialCanaries();
  await page.goto('/projects/project-phase2/youtube');
  await page.getByRole('button', { name: 'Connect YouTube' }).click();
  const authorizationUrl = await fakeProviders.takeSystemBrowserUrl();
  const consent = await page.context().newPage();
  await consent.goto(authorizationUrl);
  await consent.getByRole('button', { name: 'Allow Clip Factory Test' }).click();
  await expect(page.getByText('Connected to Clip Factory Test')).toBeVisible();
  await fakeProviders.expireRefreshTokenWithInvalidGrant();
  await page.reload();
  await expect(page.getByText('Reconnect required')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconnect YouTube' })).toBeEnabled();
  expect(await scanBrowserCredentialSinks(page.context(), canaries)).toEqual([]);
  await page.getByRole('button', { name: 'Disconnect YouTube' }).click();
  await page.getByRole('button', { name: 'Revoke access and disconnect' }).click();
  await expect(page.getByText('YouTube disconnected')).toBeVisible();
  await expect(page.getByText('Previous publication history is retained.')).toBeVisible();
});

test('switches gallery/list and shows every successful rendered clip', async ({ page }) => {
  await page.goto('/projects/project-phase2/youtube');
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('radio', { name: 'List view' }).click();
  await expect(page.getByRole('table', { name: 'YouTube publishing clips' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'List view' })).toBeChecked();
  await expect(page.getByRole('row')).toHaveCount(4);
});

test('generates separately costed metadata, edits it, and requires approval', async ({
  page,
  fakeProviders,
}) => {
  await page.goto('/projects/project-phase2/youtube?clip=clip-1');
  await page.getByRole('button', { name: 'Generate new draft' }).click();
  await expect(page.getByText('Estimated maximum: $0.050000')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm paid generation' }).click();
  await fakeProviders.completeMetadataGeneration({ costMicrousd: '12345' });
  await expect(page.getByText('Exact OpenAI cost: $0.012345')).toBeVisible();
  await page.getByLabel('YouTube title').fill('Reviewed title');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload private video' })).toBeDisabled();
  await page.getByRole('button', { name: 'Approve metadata' }).click();
  await page.getByRole('button', { name: /Approve version/ }).click();
  await expect(page.getByRole('button', { name: 'Upload private video' })).toBeEnabled();
});
```

- [ ] **RED 1.2 — Write schedules, batch isolation, and uncertainty tests.**

Add these tests to the same file:

```ts
test('assigns three independent timezones and locks unverified scheduling', async ({ page, fakeProviders }) => {
  await fakeProviders.setApiProjectVerified(true);
  await page.goto('/projects/project-phase2/youtube');
  await configureClipSchedule(page, 'One', '2026-08-01T09:30', 'Asia/Tokyo');
  await configureClipSchedule(page, 'Two', '2026-08-01T09:30', 'America/New_York');
  await configureClipSchedule(page, 'Three', '2026-08-01T09:30', 'UTC');
  await expect(page.getByText('Asia/Tokyo')).toBeVisible();
  await expect(page.getByText('America/New_York')).toBeVisible();
  await expect(page.getByText('UTC')).toBeVisible();
  await fakeProviders.setApiProjectVerified(false);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Schedule on YouTube' }).first()).toBeDisabled();
  await expect(page.getByText(/unverified API projects are restricted to private uploads/).first())
    .toBeVisible();
});

test('keeps successful siblings when another upload and thumbnail fail', async ({ page, fakeProviders }) => {
  await fakeProviders.queuePublicationOutcomes([
    { clip: 'clip-1', upload: 'SUCCESS', thumbnail: 'FORBIDDEN' },
    { clip: 'clip-2', upload: 'PERMANENT_FAILURE' },
  ]);
  await page.goto('/projects/project-phase2/youtube');
  await page.getByRole('checkbox', { name: 'Select clip One' }).check();
  await page.getByRole('checkbox', { name: 'Select clip Two' }).check();
  await page.getByRole('button', { name: 'Upload 2 selected clips' }).click();
  await page.getByRole('button', { name: 'Start 2 uploads' }).click();
  await expect(page.getByText('One uploaded privately')).toBeVisible();
  await expect(page.getByText('YouTube did not accept the cover image.')).toBeVisible();
  await expect(page.getByText('Two failed: Upload rejected.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open One on YouTube' })).toBeVisible();
});

test('never auto-retries ambiguous metadata generation', async ({ page, fakeProviders }) => {
  await fakeProviders.makeNextMetadataCallUncertain();
  await page.goto('/projects/project-phase2/youtube?clip=clip-1');
  await startConfirmedMetadataGeneration(page);
  await expect(page.getByText('The provider result is unknown. Your current draft was not changed.'))
    .toBeVisible();
  await expect(page.getByText('Up to $0.050000 may have been spent.')).toBeVisible();
  expect(await fakeProviders.metadataCallCount()).toBe(1);
  await page.waitForTimeout(250);
  expect(await fakeProviders.metadataCallCount()).toBe(1);
  await page.getByRole('button', { name: 'Authorize a new generation attempt' }).click();
  await page.getByRole('checkbox', { name: /possible prior spend/i }).check();
  await page.getByRole('button', { name: 'Reserve and generate again' }).click();
  expect(await fakeProviders.metadataCallCount()).toBe(2);
});

test('reconciles a lost final upload result before acknowledged replacement', async ({
  page,
  fakeProviders,
}) => {
  await fakeProviders.makeNextFinalUploadResultUnknown({ reconciliation: 'INCONCLUSIVE' });
  await page.goto('/projects/project-phase2/youtube?clip=clip-1');
  await startConfirmedPrivateUpload(page);
  await expect(page.getByText('Upload result unknown')).toBeVisible();
  expect(await fakeProviders.createdUploadSessionCount()).toBe(1);
  await fakeProviders.restartWorker();
  await expect.poll(() => fakeProviders.createdUploadSessionCount()).toBe(1);
  await page.getByRole('button', { name: 'Check the connected channel' }).click();
  await expect(page.getByText('No conclusive matching video was found.')).toBeVisible();
  expect(await fakeProviders.createdUploadSessionCount()).toBe(1);
  await page.getByRole('button', { name: 'Consider a replacement upload' }).click();
  await page.getByRole('checkbox', {
    name: 'I understand a duplicate YouTube video may already exist',
  }).check();
  await page.getByRole('button', { name: 'Acknowledge risk and start replacement' }).click();
  await expect.poll(() => fakeProviders.createdUploadSessionCount()).toBe(2);
});
```

Do not use fixed sleeps in production E2E assertions; the 250 ms check above is only a negative no-auto-retry observation against a fake call counter and must also be backed by the Temporal time-skipping test from Task 9.

- [ ] **RED 1.3 — Run Playwright and witness missing/broken full flows.**

```bash
pnpm exec playwright test tests/e2e/youtube-publishing.spec.ts --project=chromium
```

Expected RED: the app and fake-control shells start; the first connection test times out on `Connected to Clip Factory Test` because no sanitized `CONNECTED` event reaches the page. Import, fixture, web-server, or route-404 failures are not accepted. Record that assertion failure, fix its owning focused test from the map below, then return to E2E.

Use this fixed ownership map; do not patch behavior directly in the E2E support layer:

```ts
const failureOwner = {
  connection: 'task-8:youtube-connection.controller.test.ts',
  metadata: 'task-10:publishing-metadata-editor.test.tsx',
  upload: 'task-12:publication-workflow-restart.test.ts',
  workspace: 'task-13:youtube-workspace.test.tsx',
  recovery: 'task-14:publication-progress-list.test.tsx',
  credentialFinding: 'task-15:credential-containment.test.ts',
} as const;
```

- [ ] **GREEN 1.4 — Complete fake-provider test controls and stable locators.**

`fake-youtube-control.ts` calls test-only loopback control endpoints enabled only when `CLIP_FACTORY_TEST_ADAPTERS=true`; production builds return 404. It controls provider state, not application state. `browser-credential-scan.ts` reads cookies, local/session storage, IndexedDB databases/records, Cache Storage, page content/hydration, and captured browser network headers/bodies, searching raw/URL/base64 canaries while reporting sink/kind only.

Use role/label/name locators, response/state conditions, and no coordinate/CSS-chain selectors. Run the full file. Expected GREEN: all tests PASS with no console error, failed request, hydration warning, or credential finding.

```ts
export class FakeYouTubeControl {
  constructor(private readonly request: APIRequestContext) {}

  async configure(scenario: FakeYouTubeScenario): Promise<void> {
    const response = await this.request.post('/__test__/providers/youtube/scenario', {
      data: scenario,
      headers: { 'X-Clip-Factory-Test-Adapter': 'enabled' },
    });
    expect(response.status()).toBe(204);
  }

  async createdUploadSessionCount(): Promise<number> {
    const response = await this.request.get('/__test__/providers/youtube/state');
    return (await response.json()).createdUploadSessionCount;
  }
}

// Production route guard, before parsing the test command:
if (process.env.CLIP_FACTORY_TEST_ADAPTERS !== 'true') return new Response(null, { status: 404 });
```

```bash
pnpm exec playwright test tests/e2e/youtube-publishing.spec.ts --project=chromium
```

- [ ] **REFACTOR 1.5 — Browser accessibility/responsive evidence.**

Run the workspace/editor at 768×1024, 1024×768, and 1440×900. Add assertions for no clipped primary actions/horizontal viewport overflow at 1024+, deliberate table scroll at 768, visible focus, keyboard gallery/list/sort/dialog/schedule flows, and reduced-motion emulation. Store failure screenshots only; no screenshot may contain provider consent tokens/query strings.

```ts
for (const viewport of [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`workspace remains operable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects/project-phase2/youtube');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(viewport.width >= 1024 ? overflow : 0).toBe(0);
    await page.getByRole('radio', { name: 'List view' }).press('Space');
    await page.getByRole('button', { name: 'Sort by upload state' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Review upload' })).toBeInViewport();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toBeVisible();
  });
}
```

```bash
pnpm exec playwright test tests/e2e/youtube-publishing.spec.ts --project=chromium
```

## RED-GREEN-REFACTOR cycle 2: complete integration and CI topology

- [ ] **RED 2.1 — Write Phase 2 CI policy test before YAML changes.**

Create `phase-2-ci-policy.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

test('default CI runs Phase 2 fakes/security and never real smoke or external secrets', async () => {
  const source = await readFile('.github/workflows/ci.yml', 'utf8');
  const workflow = YAML.parse(source);
  assert.ok(workflow.jobs['youtube-security']);
  assert.match(source, /pnpm test:youtube-security/u);
  assert.match(source, /pnpm compose:up/u);
  assert.match(source, /pnpm compose:down/u);
  assert.match(source, /playwright test tests\/e2e\/youtube-publishing\.spec\.ts/u);
  assert.doesNotMatch(source, /CLIP_FACTORY_REAL_(?:YOUTUBE|OPENAI)_SMOKE/u);
  assert.doesNotMatch(source, /YOUTUBE_OAUTH_CLIENT_CONFIG_PATH|OPENAI_API_KEY/u);
  assert.equal(workflow.jobs.deploy, undefined);
  assert.equal(workflow.jobs.release, undefined);
  assert.doesNotMatch(source, /(?:docker\/login-action|actions\/deploy-pages|packages:\s*write|deployments:\s*write)/iu);
  assert.match(source, /pnpm db:migrate:deploy/u); // local disposable DB migration is required
  for (const match of source.matchAll(/uses:\s+[^\s]+@([^\s]+)/gu)) {
    assert.match(match[1], /^[a-f0-9]{40}$/u);
  }
});
```

- [ ] **RED 2.2 — Write full infrastructure integration before CI.**

`full-phase-2.test.ts` composes fresh Phase 1+2 migrations, PostgreSQL/Redis/MinIO/Temporal, web/native worker, fake Google/OpenAI/YouTube, and a synthetic 9:16 MP4. It executes: connect -> restart worker/Keychain fake refresh -> generate/approve -> three schedules -> private/scheduled uploads -> offline publication -> sibling failure -> thumbnail warning -> disconnect -> credential sink scan -> both uncertainty flows. Assert all fourteen criterion IDs as test labels.

Run:

```bash
node --test tests/architecture/phase-2-ci-policy.test.mjs
pnpm exec vitest run tests/integration/youtube-publishing/full-phase-2.test.ts
```

Expected RED: both files collect; `assert.ok(workflow.jobs['youtube-security'])` receives `undefined`, and the integration result omits at least one named criterion. YAML parse, import, and infrastructure-start failures are not accepted.

- [ ] **GREEN 2.3 — Add root scripts and pinned fake-only CI job.**

Add scripts:

```json
{
  "scripts": {
    "test:youtube": "vitest run tests/integration/youtube-publishing && playwright test tests/e2e/youtube-publishing.spec.ts",
    "test:youtube-security": "vitest run apps/web/src/modules/youtube-publishing/security tests/integration/youtube-publishing/credential-containment.test.ts && uv run --directory apps/worker pytest tests/security/test_youtube_credential_containment.py tests/contracts/test_credential_vault_contract.py tests/contracts/test_youtube_publisher_contract.py tests/contracts/test_metadata_generator_contract.py -q",
    "acceptance:phase2": "node scripts/acceptance/run-phase-2.mjs",
    "acceptance:phase2-privacy": "node scripts/acceptance/phase-2-privacy-audit.mjs"
  }
}
```

Append this job using the same immutable checkout/setup-node pins from accepted Phase 1 CI and the corrected setup-uv pin:

```yaml
youtube-security:
  runs-on: ubuntu-24.04
  timeout-minutes: 35
  permissions: { contents: read }
  steps:
    - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
    - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
      with: { node-version: "24.18.0", cache: pnpm }
    - uses: astral-sh/setup-uv@11f9893b081a58869d3b5fccaea48c9e9e46f990
      with: { version: "0.11.28", python-version: "3.12.11", enable-cache: true }
    - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
    - run: pnpm install --frozen-lockfile && uv sync --directory apps/worker --frozen
    - run: cp .env.example .env && pnpm compose:up
    - run: pnpm prisma:generate && pnpm db:migrate:deploy
    - run: pnpm test:youtube-security
    - if: always()
      run: pnpm compose:down
```

Extend existing `integration`/`e2e` jobs with:

```yaml
- run: pnpm exec vitest run tests/integration/youtube-publishing/full-phase-2.test.ts
- run: pnpm exec playwright test tests/e2e/youtube-publishing.spec.ts --project=chromium
```

The test overlay sets fake endpoints/backends and no external secret. `compose:up` starts PostgreSQL, Redis, MinIO, and Temporal with Phase 1 health checks before migrations/security tests; `compose:down` always runs, including failures. Existing CodeQL lines, if touched, use `github/codeql-action/{init,analyze}@99df26d4f13ea111d4ec1a7dddef6063f76b97e9`. Add no deployment/release/registry/migration-to-production job.

Run policy/integration/Playwright tests. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Keep `pnpm verify` comprehensive and nonduplicative.**

Add `test:youtube-security` and deterministic Phase 2 integration/E2E to the existing root verification graph exactly once. Preserve individual CI jobs for failure isolation. Run `pnpm verify`; inspect that no real-smoke marker/test is selected.

```json
{
  "scripts": {
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:coverage && pnpm test:architecture && pnpm test:contracts && pnpm test:integration && pnpm test:e2e && pnpm test:youtube-security"
  }
}
```

```bash
pnpm verify
pnpm --silent run verify | tee .artifacts/verify-phase-2.txt
! rg -n 'real_(youtube|openai)|CLIP_FACTORY_REAL_' .artifacts/verify-phase-2.txt
```

## RED-GREEN-REFACTOR cycle 3: fourteen-criterion target-Mac acceptance evidence

- [ ] **RED 3.1 — Write evidence schema test first.**

Create `phase-2-evidence-schema.test.mjs`:

```js
test('Phase 2 evidence covers fourteen criteria without credentials or private content', async () => {
  const evidence = JSON.parse(
    await readFile('.artifacts/acceptance/phase-2/latest/evidence.json', 'utf8'),
  );
  assert.deepEqual(
    evidence.criteria.map((item) => item.id),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );
  assert.equal(evidence.criteria.every((item) => item.status === 'PASS'), true);
  assert.equal(evidence.externalProviders, 'DETERMINISTIC_FAKES');
  assert.equal(evidence.keychainBackend, 'keyring.backends.macOS');
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /accessToken|refreshToken|authorizationCode|codeVerifier|clientSecret|OPENAI_API_KEY|\/Users\/|transcriptText/u,
  );
});
```

Run:

```bash
node --test tests/acceptance/phase-2-evidence-schema.test.mjs
```

Create a compile-safe RED evidence shell at `.artifacts/acceptance/phase-2/latest/evidence.json` containing `{"criteria":[],"externalProviders":"DETERMINISTIC_FAKES","keychainBackend":"keyring.backends.macOS"}` before the command. Expected RED: the schema assertion receives `[]` instead of criterion IDs 1–14. `ENOENT` is not accepted.

- [ ] **GREEN 3.2 — Create exact manifest and runner.**

`phase-2-manifest.json` contains criteria IDs/titles 1–14, generated fixture `tests/fixtures/media/vertical-12s.mp4`, three schedule tuples (`Asia/Tokyo`, `America/New_York`, `UTC`), expected private visibility, fake scenario IDs, and commands. It contains no external config path/credential.

`run-phase-2.mjs` requires `darwin`/`arm64`, exact master tool versions, real macOS Keychain backend, writable ignored artifact directory, and no real-provider flags. It starts Phase 1 lifecycle with deterministic fake Google/OpenAI/YouTube but real Keychain, runs full integration/Playwright/security/replay/migration/architecture/contract commands, restarts worker/web, executes both uncertainty scenarios, disconnects/deletes the test Keychain item in `finally`, writes `.artifacts/acceptance/phase-2/<UTC>/evidence.json`, and atomically updates `latest`.

The evidence maps:

```json
{
  "criteria": [
    { "id": 1, "evidence": ["credential-sink-scan", "browser-scan", "git-scan"] },
    { "id": 2, "evidence": ["real-keychain-worker-restart"] },
    { "id": 3, "evidence": ["testing-expiry-reauth-drafts-retained"] },
    { "id": 4, "evidence": ["gallery-list-three-renders"] },
    { "id": 5, "evidence": ["metadata-cost-edit-approval-gate"] },
    { "id": 6, "evidence": ["three-source-zones-and-utc-instants"] },
    { "id": 7, "evidence": ["resumable-private-video-id-url"] },
    { "id": 8, "evidence": ["unverified-private-only-ui-api-payload"] },
    { "id": 9, "evidence": ["offline-fake-youtube-publication"] },
    { "id": 10, "evidence": ["sibling-upload-thumbnail-isolation"] },
    { "id": 11, "evidence": ["revoke-delete-history-retained"] },
    { "id": 12, "evidence": ["architecture-contract-boundaries"] },
    { "id": 13, "evidence": ["paid-call-uncertain-no-auto-retry"] },
    { "id": 14, "evidence": ["upload-outcome-uncertain-reconcile-ack"] }
  ]
}
```

Each final evidence item also has `status: PASS`, command, timestamp, and SHA-256 artifact hash; it stores no raw logs/media/provider payload.

Run on the target Mac:

```bash
pnpm acceptance:phase2 --fixture tests/fixtures/acceptance/phase-2-manifest.json
pnpm acceptance:phase2-privacy --evidence .artifacts/acceptance/phase-2/latest
node --test tests/acceptance/phase-2-evidence-schema.test.mjs
```

Expected GREEN: all fourteen PASS, privacy scan clean, Keychain test item absent after completion.

- [ ] **REFACTOR 3.3 — Make acceptance resumable and honest.**

Runner uses an acceptance run ID and idempotency keys, resumes completed deterministic steps, never marks an unrun step PASS, and records optional real smoke as `NOT_RUN` outside the fourteen deterministic criteria. Privacy audit emits rule IDs/counts only and ignores no evidence file.

```js
for (const step of manifest.steps) {
  const previous = evidence.steps.find((item) => item.id === step.id);
  if (previous?.status === 'PASS' && await artifactHashMatches(previous)) continue;
  const result = await runStep(step, {
    idempotencyKey: `acceptance:${runId}:${step.id}`,
  });
  evidence.steps = upsertStep(evidence.steps, {
    ...result,
    status: result.exitCode === 0 ? 'PASS' : 'FAIL',
  });
  await writeEvidenceAtomically(evidence);
  if (result.exitCode !== 0) throw new Error(`acceptance step failed: ${step.id}`);
}
evidence.optionalRealSmoke = { status: 'NOT_RUN' };
```

```bash
node --test tests/acceptance/phase-2-evidence-schema.test.mjs
pnpm acceptance:phase2-privacy --evidence .artifacts/acceptance/phase-2/latest
```

## RED-GREEN-REFACTOR cycle 4: separately gated real external smoke

- [ ] **RED 4.1 — Write environment-gate tests before provider calls.**

Both smoke modules must fail/skip before importing native provider adapters unless all exact gates pass:

```python
def require_real_youtube_smoke() -> None:
    if os.environ.get('CLIP_FACTORY_REAL_YOUTUBE_SMOKE') != '1':
        pytest.skip('real YouTube smoke not explicitly enabled')
    if os.environ.get('CLIP_FACTORY_REAL_YOUTUBE_VISIBILITY') != 'private':
        pytest.fail('real YouTube smoke visibility must be private')
    if os.environ.get('CLIP_FACTORY_REAL_YOUTUBE_ACK') != 'I_ACCEPT_PRIVATE_TEST_UPLOAD':
        pytest.fail('real YouTube smoke acknowledgement missing')


def require_real_openai_smoke() -> Decimal:
    if os.environ.get('CLIP_FACTORY_REAL_OPENAI_SMOKE') != '1':
        pytest.skip('real OpenAI smoke not explicitly enabled')
    cap = Decimal(os.environ['CLIP_FACTORY_REAL_OPENAI_MAX_USD'])
    if cap <= Decimal('0') or cap > Decimal('0.10'):
        pytest.fail('real OpenAI smoke cap must be > 0 and <= 0.10 USD')
    return cap
```

Unit-test missing/wrong gates with environment isolation and assert no HTTP client is constructed.

- [ ] **RED 4.2 — Witness gates before implementing smoke body.**

```bash
uv run --directory apps/worker pytest tests/smoke/test_real_openai_metadata_generation.py tests/smoke/test_real_youtube_private_upload.py -q -m 'real_openai or real_youtube'
```

Expected: both SKIP with explicit reasons and zero network calls. A skip is correct without user opt-in.

- [ ] **GREEN 4.3 — Implement minimal private/provider smoke paths.**

OpenAI smoke performs the non-inference access check first, requires explicitly selected `gpt-5.6-sol`/high, and skips safely when that exact model is unavailable—never substituting GPT-5.5. It uses a generated two-sentence transcript, explicit cache-disabled/no-breakpoint policy, a fresh reservation under the <=$0.10 cap, validates structured metadata/complete usage/cost, records no user media, and cleans local records. It inherits `PAID_CALL_UNCERTAIN` and never auto-retries ambiguity.

YouTube smoke requires an already connected dedicated test channel in Keychain and `YOUTUBE_OAUTH_CLIENT_CONFIG_PATH` outside the repo, uploads `tests/fixtures/media/vertical-12s.mp4` with manually approved metadata and `privacyStatus=private`, records sanitized video ID/URL for manual Studio inspection, and does not schedule/publicize/delete the remote video. If final result is ambiguous, it enters `UPLOAD_OUTCOME_UNCERTAIN` and does not create a replacement.

Run only after explicit user authorization:

```bash
CLIP_FACTORY_REAL_OPENAI_SMOKE=1 \
CLIP_FACTORY_REAL_OPENAI_MAX_USD=0.10 \
uv run --directory apps/worker pytest tests/smoke/test_real_openai_metadata_generation.py -q -m real_openai

CLIP_FACTORY_REAL_YOUTUBE_SMOKE=1 \
CLIP_FACTORY_REAL_YOUTUBE_VISIBILITY=private \
CLIP_FACTORY_REAL_YOUTUBE_ACK=I_ACCEPT_PRIVATE_TEST_UPLOAD \
uv run --directory apps/worker pytest tests/smoke/test_real_youtube_private_upload.py -q -m real_youtube
```

Expected when authorized: PASS and a private video awaiting manual Studio inspection. Expected without authorization: SKIP, not implementation failure.

- [ ] **REFACTOR 4.4 — Document setup/limitations without secrets.**

`docs/youtube-publishing-setup.md` documents Desktop OAuth config creation/path/mode 0600, exact scopes, Testing seven-day warning, API audit/private restriction, feature/verification flags, Keychain service/opaque ID, reconnect/disconnect, Shorts/thumbnail limitation, quota/policy failure, deterministic commands, optional smoke gates, and manual Studio review. It contains environment names and nonsecret example paths only.

## Complete final verification

- [ ] Run:

```bash
corepack pnpm install --frozen-lockfile
pnpm worker:sync
pnpm prisma:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm test:architecture
pnpm test:contracts
pnpm db:migrate:deploy
pnpm test:integration
pnpm test:media
pnpm test:youtube-security
pnpm test:e2e
pnpm compose:config
pnpm verify
node --test tests/architecture/phase-2-ci-policy.test.mjs
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated
git diff --check
```

- [ ] On target Apple Silicon Mac, run deterministic acceptance commands from cycle 3. These require no external Google/OpenAI credential.
- [ ] Record optional external smoke as `PASS` only when explicitly run, otherwise `NOT_RUN (NO EXTERNAL CREDENTIAL AUTHORIZATION)`; never convert not-run into a failed deterministic criterion.
- [ ] Confirm `git status --short` contains no acceptance artifacts, client config, Keychain export, logs, reports, or media beyond committed generated test fixtures.

## Review gate

Approve Phase 2 implementation only when default CI and local `pnpm verify` pass, deterministic target-Mac evidence marks all fourteen criteria PASS, architecture/security scans are clean, both uncertainty states prove no automatic retry/replacement, and no Phase 1 behavior regresses. Optional real smoke affects production-enablement confidence only when the user opts in.

## Suggested commit

```text
test(youtube): verify Phase 2 publishing acceptance
```
