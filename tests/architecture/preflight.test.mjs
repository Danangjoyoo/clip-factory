import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('preflight reports every absent native dependency in check mode', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/preflight.mjs', '--path', '/usr/bin:/bin'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /uv 0\.11\.28/);
  assert.match(result.stderr, /ffmpeg 8\.1\.2/);
  assert.match(result.stderr, /ffprobe 8\.1\.2/);
});
