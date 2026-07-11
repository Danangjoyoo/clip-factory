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
