import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('compose is localhost-only and never receives the OpenAI key', () => {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      'envs/.env.example',
      '-f',
      'infra/compose/docker-compose.yml',
      'config',
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(config.services).sort(), [
    'minio',
    'minio-init',
    'postgres',
    'redis',
    'temporal',
    'temporal-ui',
    'web',
  ]);
  assert.equal(config.services.web.ports[0].host_ip, '127.0.0.1');
  assert.equal(JSON.stringify(config).includes('OPENAI_API_KEY'), false);
  assert.deepEqual(Object.keys(config.volumes).sort(), [
    'minio-data',
    'postgres-data',
    'redis-data',
  ]);
  const compose = readFileSync('infra/compose/docker-compose.yml', 'utf8');
  assert.match(compose, /mc cors set local\/clip-factory/u);
  assert.match(compose, /x-amz-checksum-sha256/u);
  assert.match(compose, /ETag/u);
  const lock = JSON.parse(
    readFileSync('infra/compose/image-lock.json', 'utf8'),
  );
  for (const name of Object.keys(lock))
    assert.equal(config.services[name].image, lock[name]);
});
