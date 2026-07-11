# Task 1: Bootstrap the Pinned Workspace and Test Runners

> **For agentic workers:** Use superpowers:test-driven-development and superpowers:verification-before-completion. Do not start Task 2 until every command below is green.

## Purpose and traceability

Create the smallest runnable pnpm/Next.js and uv/Python monorepo spine. This realizes design §§6–7, 26–27, and 30 without adding product behavior.

## Layers and boundaries

- Creates empty feature-capable shells only: `apps/web/src/app`, `apps/worker/src/clip_factory`, `packages/contracts`, and `packages/config`.
- No framework type crosses into a domain/application directory.
- Package names are fixed: `@clip-factory/web`, `@clip-factory/contracts`, `@clip-factory/config`, and `clip-factory-worker`.

## Exact files

- Create: `.node-version`, `.python-version`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, `scripts/bootstrap-node.sh`, `scripts/bootstrap-uv.sh`
- Modify: `.gitignore` by appending generated/tool directories while preserving `.superpowers/` and every existing rule
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/page.test.tsx`
- Create: `packages/contracts/package.json`, `packages/contracts/src/index.ts`, `packages/config/package.json`, `packages/config/src/index.ts`
- Create: `apps/worker/pyproject.toml`, `apps/worker/uv.lock`, `apps/worker/src/clip_factory/__init__.py`, `apps/worker/tests/test_bootstrap.py`
- Create: `tests/architecture/workspace.test.mjs`
- Create through package managers after review: `pnpm-lock.yaml`

## Prerequisites and produced interfaces

- Prerequisite: isolated worktree from the final commit containing the approved specs and both complete phase-plan folders.
- Produces root commands consumed by every later task and Python package version `0.1.0`.
- Root `verify` is exactly `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:architecture && pnpm test:contracts`.

## RED → GREEN → REFACTOR

- [ ] **RED: create minimal readable manifests with intentionally wrong identity/version sentinels, then create the workspace contract test.** This is a behavioral RED: JSON parsing and imports succeed before the assertion fails.

```js
// tests/architecture/workspace.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

test('pins the four workspace identities and package manager', async () => {
  const root = await readJson('package.json');
  const web = await readJson('apps/web/package.json');
  const contracts = await readJson('packages/contracts/package.json');
  const config = await readJson('packages/config/package.json');
  assert.equal(root.packageManager, 'pnpm@11.11.0');
  assert.equal(web.name, '@clip-factory/web');
  assert.equal(contracts.name, '@clip-factory/contracts');
  assert.equal(config.name, '@clip-factory/config');
  assert.equal((await readFile('.node-version', 'utf8')).trim(), '24.18.0');
  assert.equal((await readFile('.python-version', 'utf8')).trim(), '3.12.11');
});
```

- [ ] **Witness RED.** Run `node --test tests/architecture/workspace.test.mjs`. Expect the named assertion to FAIL with actual `pnpm@0.0.0` versus expected `pnpm@11.11.0`; no `ENOENT`, parse, or module-resolution error is accepted as RED evidence.

- [ ] **GREEN: create pinned root files and workspace manifests.**

```bash
# scripts/bootstrap-node.sh
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
VERSION="24.18.0"
BASE="https://nodejs.org/dist/v$VERSION"
ARCHIVE="node-v$VERSION-darwin-arm64.tar.gz"
mkdir -p "$TOOLS"
curl --fail --location --silent --show-error "$BASE/$ARCHIVE" -o "$TOOLS/$ARCHIVE"
curl --fail --location --silent --show-error "$BASE/SHASUMS256.txt" -o "$TOOLS/SHASUMS256.txt"
(cd "$TOOLS" && grep "  $ARCHIVE\$" SHASUMS256.txt | shasum -a 256 --check)
rm -rf "$TOOLS/node"
mkdir -p "$TOOLS/node"
tar -xzf "$TOOLS/$ARCHIVE" -C "$TOOLS/node" --strip-components=1
"$TOOLS/node/bin/node" --version | grep -Fx "v$VERSION"
PATH="$TOOLS/node/bin:$PATH" corepack enable --install-directory "$TOOLS/node/bin"
PATH="$TOOLS/node/bin:$PATH" corepack prepare pnpm@11.11.0 --activate

# scripts/bootstrap-uv.sh
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
ARCHIVE="$TOOLS/uv-aarch64-apple-darwin.tar.gz"
mkdir -p "$TOOLS/bin" "$TOOLS/extract"
curl --fail --location --silent --show-error "https://github.com/astral-sh/uv/releases/download/0.11.28/uv-aarch64-apple-darwin.tar.gz" -o "$ARCHIVE"
echo "33540eb7c883ab857eff79bd5ac2aa31fe27b595abecb4a9c003a2c998447232  $ARCHIVE" | shasum -a 256 --check
tar -xzf "$ARCHIVE" -C "$TOOLS/extract"
install -m 0755 "$TOOLS/extract/uv-aarch64-apple-darwin/uv" "$TOOLS/bin/uv"
install -m 0755 "$TOOLS/extract/uv-aarch64-apple-darwin/uvx" "$TOOLS/bin/uvx"
"$TOOLS/bin/uv" python install 3.12.11
```

```json
{
  "name": "clip-factory",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.11.0",
  "engines": { "node": "24.18.0", "pnpm": "11.11.0" },
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "pnpm -r lint && pnpm worker:lint",
    "typecheck": "pnpm -r typecheck && pnpm worker:typecheck",
    "test:unit": "vitest run --project unit && pnpm worker:test",
    "test:coverage": "vitest run --coverage && .tools/bin/uv run --directory apps/worker pytest --cov=clip_factory --cov-report=term-missing --cov-fail-under=90",
    "test:architecture": "node --test tests/architecture/*.test.mjs && pnpm worker:architecture",
    "test:contracts": "pnpm --filter @clip-factory/contracts test",
    "test:integration": "vitest run --project integration",
    "test:media": ".tools/bin/uv run --directory apps/worker pytest tests/media -v",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "compose:config": "docker compose --env-file .env -f infra/compose/docker-compose.yml config --quiet",
    "compose:up": "docker compose --env-file .env -f infra/compose/docker-compose.yml up -d --wait",
    "compose:down": "docker compose --env-file .env -f infra/compose/docker-compose.yml down",
    "worker:sync": ".tools/bin/uv sync --directory apps/worker --frozen",
    "worker:lint": ".tools/bin/uv run --directory apps/worker ruff check src tests",
    "worker:typecheck": ".tools/bin/uv run --directory apps/worker mypy src tests",
    "worker:test": ".tools/bin/uv run --directory apps/worker pytest -q",
    "worker:architecture": ".tools/bin/uv run --directory apps/worker lint-imports",
    "dev": "node scripts/dev.mjs",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:architecture && pnpm test:contracts"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@vitest/coverage-v8": "4.1.10",
    "dependency-cruiser": "18.0.0",
    "eslint": "10.7.0",
    "jsdom": "27.3.0",
    "prettier": "3.8.1",
    "typescript": "7.0.2",
    "vitest": "4.1.10"
  }
}
```

Create `apps/web/package.json` with:

```json
{
  "name": "@clip-factory/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -H 127.0.0.1",
    "build": "next build",
    "start": "next start -H 127.0.0.1",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@clip-factory/config": "workspace:*",
    "@clip-factory/contracts": "workspace:*",
    "next": "16.2.10",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3"
  }
}
```

Create `packages/contracts/package.json` with:

```json
{
  "name": "@clip-factory/contracts",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": {
    "generate": "node scripts/generate.mjs",
    "lint": "eslint src scripts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Create `packages/config/package.json` with:

```json
{
  "name": "@clip-factory/config",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": {
    "lint": "eslint src scripts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/web
  - packages/*
```

```toml
# apps/worker/pyproject.toml
[project]
name = "clip-factory-worker"
version = "0.1.0"
requires-python = "==3.12.11"
dependencies = []

[dependency-groups]
dev = [
  "import-linter==2.13",
  "mypy==2.2.0",
  "pytest==9.1.1",
  "pytest-cov==7.1.0",
  "ruff==0.15.21"
]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]

[tool.mypy]
python_version = "3.12"
strict = true
```

- [ ] Run `./scripts/bootstrap-node.sh && ./scripts/bootstrap-uv.sh`, then `export PATH="$PWD/.tools/node/bin:$PWD/.tools/bin:$PATH"`. Run `node --version`, `pnpm --version`, and `uv --version`; require exactly `v24.18.0`, `11.11.0`, and `uv 0.11.28`. Generate reviewed locks with `pnpm install --lockfile-only && uv lock --directory apps/worker`, then perform the real installs with `pnpm install --frozen-lockfile && uv sync --directory apps/worker --frozen`. Run the workspace test; expect PASS.

- [ ] **RED: add smoke tests before app/package bodies.**

```tsx
// apps/web/src/app/page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('identifies the local application', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Clip Factory' })).toBeVisible();
  });
});
```

```python
# apps/worker/tests/test_bootstrap.py
from clip_factory import __version__


def test_worker_package_version_is_pinned() -> None:
    assert __version__ == "0.1.0"
```

- [ ] Before running the tests, create compiling shells whose page heading is `Bootstrap` and whose worker `__version__` is `0.0.0`. Witness RED with `pnpm exec vitest run apps/web/src/app/page.test.tsx`; expect only the heading assertion to FAIL. Run `uv run --directory apps/worker pytest tests/test_bootstrap.py -q`; expect only the version assertion to FAIL. Missing imports, collection errors, or missing dependencies are setup failures, not valid RED evidence.

- [ ] **GREEN: add the smallest runnable shells.**

```tsx
// apps/web/src/app/page.tsx
export default function HomePage() {
  return <h1>Clip Factory</h1>;
}
```

```python
# apps/worker/src/clip_factory/__init__.py
__version__ = "0.1.0"
```

- [ ] Run `pnpm exec vitest run apps/web/src/app/page.test.tsx && uv run --directory apps/worker pytest tests/test_bootstrap.py -q`; expect both tests PASS.

- [ ] **REFACTOR:** add strict base TS config (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: Bundler`, `target: ES2023`), the smallest Next layout, Vitest jsdom setup, Prettier config, and package-level `lint`, `typecheck`, and `test` scripts. Keep smoke tests green.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

## Broader verification

```bash
pnpm install --frozen-lockfile
pnpm worker:sync
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
git diff --check
```

Expected: all commands exit 0, installs do not rewrite either lockfile, and no product behavior beyond the two smoke assertions exists.

**Suggested commit:** `chore: bootstrap pinned clip factory workspace`
