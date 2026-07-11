import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

async function runScanner(files) {
  const root = await mkdtemp(join(tmpdir(), 'clip-factory-boundary-'));
  try {
    for (const [relative, source] of Object.entries(files)) {
      const path = join(root, relative);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, source);
    }
    return spawnSync(
      process.execPath,
      ['scripts/check-ts-boundaries.mjs', root],
      {
        encoding: 'utf8',
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('rejects Prisma imports from application code', async () => {
  const result = await runScanner({
    'modules/projects/application/services/bad.ts':
      "import { PrismaClient } from '@prisma/client';\nexport const bad = PrismaClient;\n",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /application.*must not import @prisma\/client/);
});

test('rejects boundary DTO imports from domain code', async () => {
  const result = await runScanner({
    'modules/projects/domain/model.ts':
      "import type { ProjectApi } from '../dto/api/project';\nexport type Model = ProjectApi;\n",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /domain.*must not import boundary DTO/);
});

test('rejects node and provider imports from domain code', async () => {
  const result = await runScanner({
    'modules/projects/domain/model.ts':
      "import { readFile } from 'node:fs';\nexport const read = readFile;\n",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /domain.*must not import node:fs/);
});

test('accepts application imports owned by the application layer', async () => {
  const result = await runScanner({
    'modules/projects/application/services/good.ts':
      "import type { Project } from '../../domain/project';\nexport type Service = Project;\n",
  });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects inner-to-outer imports and dependency cycles', async () => {
  const result = await runScanner({
    'modules/projects/domain/model.ts':
      "import type { Store } from '../adapters/store';\nexport type Model = Store;\n",
    'modules/projects/adapters/store.ts':
      "import type { Model } from '../domain/model';\nexport type Store = Model;\n",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /domain.*must not import outer layer/);
  assert.match(result.stderr, /cycle detected/);
});

test('rejects outer peer imports', async () => {
  const result = await runScanner({
    'modules/projects/delivery/route.ts':
      "import type { Store } from '../adapters/store';\nexport type Route = Store;\n",
    'modules/projects/adapters/store.ts': 'export type Store = unknown;\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /delivery.*must not import outer peer adapters/);
});

test('rejects concrete adapter imports outside composition', async () => {
  const result = await runScanner({
    'modules/projects/application/services/service.ts':
      "import type { Store } from '../../adapters/store';\nexport type Service = Store;\n",
    'modules/projects/adapters/store.ts': 'export type Store = unknown;\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /application.*must not import concrete adapter/);
});

test('rejects domain-to-application imports', async () => {
  const result = await runScanner({
    'modules/projects/domain/model.ts':
      "import type { Service } from '../application/services/service';\nexport type Model = Service;\n",
    'modules/projects/application/services/service.ts':
      'export type Service = unknown;\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /domain.*must not import application/);
});

test('allows composition to import concrete adapters', async () => {
  const result = await runScanner({
    'modules/projects/composition/root.ts':
      "import type { Store } from '../adapters/store';\nexport type Root = Store;\n",
    'modules/projects/adapters/store.ts': 'export type Store = unknown;\n',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('allows adapters and delivery to use their owned converters', async () => {
  const result = await runScanner({
    'modules/projects/adapters/repositories/store.ts':
      "import type { Record } from '../converters/store';\nexport type Store = Record;\n",
    'modules/projects/adapters/converters/store.ts':
      'export type Record = unknown;\n',
    'modules/projects/delivery/route.ts':
      "import type { Api } from '../converters/api';\nexport type Route = Api;\n",
    'modules/projects/converters/api.ts': 'export type Api = unknown;\n',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects alias re-exports and side-effect imports across inner boundaries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'clip-factory-boundary-'));
  try {
    await mkdir(join(root, 'modules/projects/domain'), { recursive: true });
    await mkdir(join(root, 'modules/projects/adapters'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['*'] } },
      }),
    );
    await writeFile(
      join(root, 'modules/projects/domain/model.ts'),
      "export { Store } from '@/modules/projects/adapters/store';\nimport '@/modules/projects/adapters/register';\n",
    );
    await writeFile(
      join(root, 'modules/projects/adapters/store.ts'),
      'export type Store = unknown;\n',
    );
    await writeFile(
      join(root, 'modules/projects/adapters/register.ts'),
      'export const registered = true;\n',
    );
    const result = spawnSync(
      process.execPath,
      ['scripts/check-ts-boundaries.mjs', root],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /domain.*must not import outer layer adapters/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects require and dynamic imports across inner boundaries', async () => {
  const result = await runScanner({
    'modules/projects/domain/model.ts':
      "const store = require('../adapters/store');\nconst dynamic = import('../adapters/store');\nexport { store, dynamic };\n",
    'modules/projects/adapters/store.ts': 'export const store = true;\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /domain.*must not import outer layer adapters/);
});

test('rejects provider SDK subpaths through the TypeScript boundary policy', async () => {
  const result = await runScanner({
    'modules/projects/application/services/bad.ts':
      "import client from '@aws-sdk/client-s3';\nexport default client;\n",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /application.*must not import @aws-sdk\/client-s3/);
});
