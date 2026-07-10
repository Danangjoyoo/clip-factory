# Task 36: GitHub CI, CodeQL, Dependabot, and Absence Guards

> **For agentic workers:** Use superpowers:test-driven-development and superpowers:verification-before-completion. CI assembles already-green commands; it does not become the first place a task is tested.

## Purpose and traceability

Implement design §26 and acceptance criteria 12–13: all web/worker/architecture/contracts/migrations/infrastructure/media/E2E/build checks on free Ubuntu, plus CodeQL/Dependabot, immutable action pins, least privilege, and explicit absence of CD/secrets/paid calls.

## Layers and owned boundaries

- CI owns no product DTO, port, adapter, repository, or policy; it executes the layer-owned commands produced by Tasks 1–35.
- Workflow YAML is delivery infrastructure. It may reference package scripts and test Compose, but never import or duplicate application policy.
- Architecture/contract jobs enforce every API↔Entity, Entity↔Record, Client↔Entity, Python entrypoint, and provider boundary before integration jobs run.

## Exact files and prerequisites

- Requires Tasks 1–35.
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/dependabot.yml`
- Create: `tests/architecture/github-workflows.test.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Pin `yaml` to `2.8.2` without a range.

## RED → GREEN → REFACTOR

- [ ] **RED: write workflow-policy test before YAML.**

```js
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

test('workflows use immutable actions and contain no deployment authority', async () => {
  const names = (await readdir('.github/workflows')).filter((name) => name.endsWith('.yml'));
  assert.deepEqual(names.sort(), ['ci.yml','codeql.yml']);
  for (const name of names) {
    const source = await readFile(`.github/workflows/${name}`, 'utf8');
    const workflow = YAML.parse(source);
    assert.equal('pull_request_target' in (workflow.on ?? {}), false);
    assert.doesNotMatch(source, /uses:\s+[^\s]+@(?![a-f0-9]{40}(?:\s|$))/u);
    assert.doesNotMatch(source, /OPENAI_API_KEY|YOUTUBE|docker\/login-action|packages:\s*write|deploy|release/u);
    assert.deepEqual(workflow.permissions, { contents:'read' });
  }
});
```

- [ ] Run `node --test tests/architecture/github-workflows.test.mjs`; expect FAIL because workflows are absent.

- [ ] **GREEN: create `ci.yml` with this complete job topology and exact action pins.** Repeat the shown checkout/setup/install preamble in every job; no local composite action is introduced.

```yaml
name: CI
on:
  pull_request: { branches: [master] }
  push: { branches: [master] }
  workflow_dispatch:
permissions: { contents: read }
concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
env:
  CI: "true"
  NODE_VERSION: "24.18.0"
  PNPM_VERSION: "11.11.0"
  UV_VERSION: "0.11.28"
jobs:
  web-quality:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with: { node-version: "24.18.0", cache: pnpm }
      - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm --filter @clip-factory/web lint
      - run: pnpm --filter @clip-factory/web typecheck
      - run: pnpm exec vitest run --project unit --coverage
      - run: pnpm --filter @clip-factory/web build
      - if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with: { name: web-failure, path: coverage, retention-days: 3 }
  worker-quality:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: astral-sh/setup-uv@11f9893b081a58869d3b5fccaea48c9e9e46f990
        with: { version: "0.11.28", python-version: "3.12.11", enable-cache: true }
      - run: uv sync --directory apps/worker --frozen
      - run: uv run --directory apps/worker ruff format --check src tests
      - run: uv run --directory apps/worker ruff check src tests
      - run: uv run --directory apps/worker mypy src tests
      - run: uv run --directory apps/worker pytest --cov=clip_factory --cov-report=xml --cov-fail-under=90
      - if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with: { name: worker-failure, path: apps/worker/coverage.xml, retention-days: 3 }
  architecture-contracts:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with: { node-version: "24.18.0", cache: pnpm }
      - uses: astral-sh/setup-uv@11f9893b081a58869d3b5fccaea48c9e9e46f990
        with: { version: "0.11.28", python-version: "3.12.11", enable-cache: true }
      - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
      - run: pnpm install --frozen-lockfile && uv sync --directory apps/worker --frozen
      - run: pnpm test:architecture
      - run: pnpm test:contracts
      - run: git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated packages/contracts/test-fixtures/cost-conformance-vectors.json
  migrations:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:17.5-bookworm@sha256:fbcea1bd13b6a882cd6caa6b58db3ae5c102efe50ec625b3e2a5cbc50db5bfe4
        env: { POSTGRES_DB: clip_factory_test, POSTGRES_USER: clip_factory, POSTGRES_PASSWORD: clip_factory_test }
        ports: ["5432:5432"]
        options: --health-cmd "pg_isready -U clip_factory -d clip_factory_test" --health-interval 2s --health-timeout 2s --health-retries 30
    env: { DATABASE_URL: "postgresql://clip_factory:clip_factory_test@127.0.0.1:5432/clip_factory_test" }
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with: { node-version: "24.18.0", cache: pnpm }
      - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma:generate && pnpm exec prisma validate && pnpm db:migrate:deploy
      - run: pnpm exec vitest run tests/integration/database/core-schema.test.ts
  integration:
    runs-on: ubuntu-24.04
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with: { node-version: "24.18.0", cache: pnpm }
      - uses: astral-sh/setup-uv@11f9893b081a58869d3b5fccaea48c9e9e46f990
        with: { version: "0.11.28", python-version: "3.12.11", enable-cache: true }
      - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
      - run: pnpm install --frozen-lockfile && uv sync --directory apps/worker --frozen
      - run: pnpm test:integration
      - if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with: { name: integration-failure, path: .artifacts/integration, retention-days: 3 }
  media:
    runs-on: ubuntu-24.04
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - run: docker compose -p clip-factory-media -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.test.yml --profile media run --rm media-test
      - if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with: { name: media-failure, path: .artifacts/media, retention-days: 3 }
  e2e:
    runs-on: ubuntu-24.04
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with: { node-version: "24.18.0", cache: pnpm }
      - run: corepack enable && corepack prepare pnpm@11.11.0 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - if: failure()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with: { name: playwright-failure, path: "playwright-report\ntest-results", retention-days: 3 }
  docker-build:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f
      - uses: docker/build-push-action@10e90e3645eae34f1e60eeb005ba3a3d33f178e8
        with: { context: ., file: infra/compose/web.Dockerfile, push: false, load: false, cache-from: type=gha, cache-to: "type=gha,mode=max" }
      - run: docker compose --env-file .env.example -f infra/compose/docker-compose.yml config --quiet
```

- [ ] Run architecture workflow test; expect PASS after adding `yaml@2.8.2` dev dependency.

- [ ] **RED: CodeQL/Dependabot test.** Assert CodeQL matrix is `javascript-typescript,python,actions`, triggers PR/push/weekly, and Dependabot has pnpm, pip, docker, github-actions weekly groups.

- [ ] **GREEN: create the complete CodeQL workflow and Dependabot configuration.**

```yaml
# .github/workflows/codeql.yml
name: CodeQL
on:
  pull_request: { branches: [master] }
  push: { branches: [master] }
  schedule: [{ cron: "17 3 * * 1" }]
  workflow_dispatch:
permissions: { contents: read }
jobs:
  analyze:
    permissions:
      contents: read
      security-events: write
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        language: [javascript-typescript, python, actions]
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: github/codeql-action/init@99df26d4f13ea111d4ec1a7dddef6063f76b97e9
        with: { languages: "${{ matrix.language }}", build-mode: none }
      - uses: github/codeql-action/analyze@99df26d4f13ea111d4ec1a7dddef6063f76b97e9
```

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups: { pnpm-minor-patch: { update-types: [minor, patch] } }
  - package-ecosystem: pip
    directory: /apps/worker
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups: { python-minor-patch: { update-types: [minor, patch] } }
  - package-ecosystem: docker
    directory: /infra/compose
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups: { docker-minor-patch: { update-types: [minor, patch] } }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups: { actions-minor-patch: { update-types: [minor, patch] } }
```

- [ ] **REFACTOR:** pin service/container digests from Task 4 lock, set all timeouts, caches with no env secrets, upload artifacts only on failure/3 days, and add explicit tests that default CI never invokes smoke tests, registry, deployment, release, or production migration.

## Verification and commit

```bash
node --test tests/architecture/github-workflows.test.mjs
pnpm test:architecture
pnpm verify
git diff --check
```

Expected: local commands pass and static tests prove immutable actions, least privilege, full check topology, and no CD/external secrets.

**Suggested commit:** `ci: add phase one quality and security gates`
