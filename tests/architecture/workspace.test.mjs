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
