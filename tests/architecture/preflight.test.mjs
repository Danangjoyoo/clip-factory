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
  assert.doesNotMatch(result.stderr, /uv 0\.11\.28/);
  assert.match(result.stderr, /ffmpeg 8\.1\.2/);
  assert.match(result.stderr, /ffprobe 8\.1\.2/);
});

test('uv bootstrap selects Linux archive without running installers', () => {
  const result = spawnSync(
    'bash',
    ['scripts/bootstrap-uv.sh', '--platform', 'linux-x86_64', '--dry-run'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /uv-x86_64-unknown-linux-gnu\.tar\.gz/);
  assert.doesNotMatch(result.stdout, /apt-get|curl .*ffmpeg/);
});
