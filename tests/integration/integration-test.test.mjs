import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  assertFakeMode,
  assertTerminalState,
  parseArgs,
  redactReport,
  validateSample,
} from '../../scripts/integration-test.js';

test('defaults to the supplied sample and fake mode', () => {
  const options = parseArgs([]);
  assert.equal(options.mode, 'fake');
  assert.match(options.sample, /samples[\\/]what-is-branding\.mp4$/u);
});

test('rejects live mode before any network work', () => {
  assert.throws(() => assertFakeMode({ OPENAI_ADAPTER: 'live' }), /fake mode/u);
  assert.doesNotThrow(() => assertFakeMode({ OPENAI_ADAPTER: 'fake' }));
});

test('validates a non-empty regular sample file', async () => {
  const sample = join(tmpdir(), `clip-factory-${Date.now()}.mp4`);
  await writeFile(sample, 'fixture');
  await assert.doesNotReject(validateSample(sample));
  await assert.rejects(validateSample(`${sample}.missing`), /regular file/u);
});

test('redacts secrets, absolute paths, and transcript text from reports', () => {
  const report = redactReport({
    source: '/Users/mac/video.mp4',
    transcript: 'private words',
    apiKey: 'sk-secret',
    model: 'fake-highlights-v1',
    costMicrousd: '12',
  });
  assert.deepEqual(report, {
    source: '[REDACTED_PATH]',
    transcript: '[REDACTED_TEXT]',
    apiKey: '[REDACTED_SECRET]',
    model: 'fake-highlights-v1',
    costMicrousd: '12',
  });
  assert.doesNotMatch(JSON.stringify(report), /Users|private words|sk-secret/u);
});

test('fails the gate when a job does not reach a terminal state', () => {
  assert.throws(
    () => assertTerminalState({ status: 'RUNNING' }),
    /terminal state/u,
  );
  assert.doesNotThrow(() => assertTerminalState({ status: 'COMPLETED' }));
  assert.doesNotThrow(() => assertTerminalState({ status: 'FAILED' }));
});
