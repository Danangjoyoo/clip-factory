# Task 2: Enforce Clean Architecture and Boundary-Specific Types

> **For agentic workers:** Use superpowers:test-driven-development. Seed each violation, witness the gate catch it, then remove only the seeded violation.

## Purpose and traceability

Turn design §30 and acceptance criterion 13 into executable TypeScript and Python policy before feature code exists.

## Layers and owned boundaries

- TypeScript feature shape: `domain`, `application/{dto/entity,ports,services,data-services}`, `adapters`, `delivery`, `converters`, `composition`.
- Python shape: `domain`, `application`, `ports`, `adapters`, `entrypoints/temporal`, `composition`.
- Owns scanners only; it does not own feature DTOs or provider adapters.

## Exact files

- Create: `.dependency-cruiser.cjs`, `scripts/check-ts-boundaries.mjs`, `tests/architecture/typescript-boundaries.test.mjs`
- Create: `apps/web/eslint.config.mjs`, `apps/worker/.importlinter`, `apps/worker/tests/architecture/test_import_boundaries.py`
- Modify: `package.json`, `apps/worker/pyproject.toml`

## Prerequisites and interfaces

- Requires Task 1 commands and package roots.
- Produces authoritative `pnpm test:architecture` and four exit codes: dependency direction, cycle, DTO leak, Python import contract.

## RED → GREEN → REFACTOR

- [ ] **RED: write the scanner characterization before its implementation.**

```js
// tests/architecture/typescript-boundaries.test.mjs
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('rejects Prisma imports from application code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'clip-factory-boundary-'));
  const target = join(root, 'modules/projects/application/services');
  await mkdir(target, { recursive: true });
  await writeFile(join(target, 'bad.ts'), "import { PrismaClient } from '@prisma/client';\nexport const bad = PrismaClient;\n");
  const result = spawnSync(process.execPath, ['scripts/check-ts-boundaries.mjs', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /application.*must not import @prisma\/client/);
  await rm(root, { recursive: true, force: true });
});
```

- [ ] Before RED, create a compile-safe `scripts/check-ts-boundaries.mjs` shell that always exits `0`; run `node --check scripts/check-ts-boundaries.mjs` and expect PASS. Then run `node --test tests/architecture/typescript-boundaries.test.mjs`; expect the named status assertion to FAIL with actual `0` versus expected `1`, while module loading succeeds.

- [ ] **GREEN: implement the narrow leak scanner.**

```js
// scripts/check-ts-boundaries.mjs
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.argv[2] ?? 'apps/web/src';
const forbidden = [
  ['application', /from ['"](?:@prisma\/client|next|react|redis|@aws-sdk|@temporalio|openai)['"]/, 'provider/framework'],
  ['domain', /from ['"](?:@prisma\/client|next|react|redis|@aws-sdk|@temporalio|openai|node:fs)['"]/, 'provider/framework'],
  ['application', /\/dto\/(?:api|record|client)\//, 'boundary DTO'],
  ['domain', /\/dto\/(?:api|record|client)\//, 'boundary DTO']
];

const files = [];
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await visit(child);
    else if (['.ts', '.tsx'].includes(extname(child))) files.push(child);
  }
}
await visit(root);
let failed = false;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const [layer, pattern, kind] of forbidden) {
    if (file.includes(`/${layer}/`) && pattern.test(source)) {
      process.stderr.write(`${layer} in ${file} must not import ${kind}\n`);
      failed = true;
    }
  }
}
process.exitCode = failed ? 1 : 0;
```

- [ ] Run the same test; expect PASS. Then run `node scripts/check-ts-boundaries.mjs apps/web/src`; expect exit 0.

- [ ] **RED: seed a real forbidden import and a Python contract test.** Create `apps/web/src/modules/architecture-probe/application/services/bad.ts` containing `import { PrismaClient } from '@prisma/client';` and add:

```python
# apps/worker/tests/architecture/test_import_boundaries.py
from pathlib import Path


def test_import_linter_contract_names_are_stable() -> None:
    config = Path(".importlinter").read_text()
    assert "domain-has-no-outer-imports" in config
    assert "application-has-no-adapter-imports" in config
    assert "temporal-entrypoints-are-outer" in config
```

- [ ] Create a compile-safe `.importlinter` containing the declared contracts and verify `uv run --directory apps/worker lint-imports` parses it. Run `node scripts/check-ts-boundaries.mjs apps/web/src`; expect the named forbidden-import assertion to FAIL naming `bad.ts`. Run `uv run --directory apps/worker pytest tests/architecture/test_import_boundaries.py -q`; expect the named forbidden fixture import assertion to FAIL, never a missing-config/setup failure.

- [ ] **GREEN: delete the seeded TypeScript file and create the Python import contracts.**

```ini
# apps/worker/.importlinter
[importlinter]
root_package = clip_factory

[importlinter:contract:domain]
name = domain-has-no-outer-imports
type = forbidden
source_modules = clip_factory.domain
forbidden_modules = clip_factory.application
    clip_factory.ports
    clip_factory.adapters
    clip_factory.entrypoints
    clip_factory.composition

[importlinter:contract:application]
name = application-has-no-adapter-imports
type = forbidden
source_modules = clip_factory.application
forbidden_modules = clip_factory.adapters
    clip_factory.entrypoints
    clip_factory.composition

[importlinter:contract:temporal]
name = temporal-entrypoints-are-outer
type = forbidden
source_modules = clip_factory.domain
    clip_factory.application
    clip_factory.ports
forbidden_modules = clip_factory.entrypoints.temporal
```

- [ ] Run `pnpm test:architecture`; expect PASS.

- [ ] **REFACTOR:** configure dependency-cruiser to reject cycles, outer-to-outer imports, and non-composition concrete construction; configure ESLint `no-restricted-imports` for generated/SDK/DTO leaks. Add a scanner fixture for each rule and assert its exact diagnostic before removing it.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

## Architecture checks

```bash
pnpm exec depcruise --config .dependency-cruiser.cjs apps/web/src
node scripts/check-ts-boundaries.mjs apps/web/src
uv run --directory apps/worker lint-imports
pnpm test:architecture
```

Expected: all real sources pass; the automated tests prove each seeded violation returns nonzero.

**Suggested commit:** `test: enforce clean architecture boundaries`
