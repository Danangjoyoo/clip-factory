import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('application boundary scanner rejects Google SDK types', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-ts-boundaries.mjs',
      'tests/architecture/fixtures/ts/domain/youtube-sdk-leak.ts',
    ],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Google SDK import is adapter-only/);
});

test('application repository ports reject Record DTO signatures', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-ts-boundaries.mjs',
      'tests/architecture/fixtures/ts/application/ports/record-repository-leak.ts',
    ],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /repository ports must use application Entity DTOs/,
  );
});

test('adapter scanner permits Google SDK types', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-ts-boundaries.mjs',
      'tests/architecture/fixtures/ts/adapters/youtube-sdk-allowed.ts',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
});
