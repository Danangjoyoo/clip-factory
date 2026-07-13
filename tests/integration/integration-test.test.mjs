import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  assertManualMode,
  assertProjectAccepted,
  assertTerminalState,
  parseArgs,
  redactReport,
  run,
  validateSample,
} from '../../scripts/integration-test.js';

test('defaults to the supplied sample and manual mode', () => {
  const options = parseArgs([]);
  assert.equal(options.mode, 'manual');
  assert.match(options.sample, /samples[\\/]what-is-branding\.mp4$/u);
});

test('rejects fake or live highlight modes before any network work', () => {
  assert.throws(
    () => assertManualMode({ OPENAI_ADAPTER: 'fake' }, 'fake'),
    /manual mode/u,
  );
  assert.throws(
    () => assertManualMode({ OPENAI_ADAPTER: 'live' }, 'live'),
    /manual mode/u,
  );
  assert.doesNotThrow(() => assertManualMode({}, 'manual'));
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
    model: 'mlx-community/whisper-large-v3-mlx',
    costMicrousd: '12',
  });
  assert.deepEqual(report, {
    source: '[REDACTED_PATH]',
    transcript: '[REDACTED_TEXT]',
    apiKey: '[REDACTED_SECRET]',
    model: 'mlx-community/whisper-large-v3-mlx',
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

test('accepts only draft local-file projects from the project route', () => {
  assert.doesNotThrow(() =>
    assertProjectAccepted({
      id: 'project-1',
      status: 'DRAFT',
      source: { kind: 'LOCAL_FILE' },
    }),
  );
  assert.throws(
    () => assertProjectAccepted({ id: 'project-1', status: 'COMPLETED' }),
    /accepted draft/u,
  );
  assert.throws(
    () =>
      assertProjectAccepted({
        id: 'project-1',
        status: 'DRAFT',
        source: { kind: 'BROWSER_UPLOAD' },
      }),
    /local-file/u,
  );
});

test('runs browser UI checks as part of the integration gate', async () => {
  const sample = join(tmpdir(), `clip-factory-ui-${Date.now()}.mp4`);
  await writeFile(sample, 'fixture');
  const project = {
    id: 'project-1',
    status: 'DRAFT',
    source: { kind: 'LOCAL_FILE' },
  };
  const requestedPaths = [];
  const http = async (_baseUrl, path, init = {}) => {
    requestedPaths.push(path);
    if (path === '/api/health') return { status: 'HEALTHY' };
    if (path === '/api/projects' && init.method === 'POST') return project;
    if (path === '/api/projects/project-1/workflow' && init.method === 'POST')
      return {
        projectId: 'project-1',
        status: 'COMPLETED',
        clipIds: [],
        renderIds: [],
        editorHref: '/projects/project-1/editor',
        resultsHref: '/projects/project-1/clips',
      };
    if (path === '/api/projects') return [project];
    throw new Error(`unexpected request ${path}`);
  };
  const ui = async ({ baseUrl, sample: uiSample }) => {
    assert.equal(baseUrl, 'http://127.0.0.1:3000');
    assert.equal(uiSample, sample);
    return [
      'ui-new-project-localpath-editor',
      'ui-transcript-download',
      'ui-manual-clip-download',
      'ui-new-project-upload-editor',
    ];
  };

  const report = await run(parseArgs(['--sample', sample]), process.env, {
    request: http,
    uiChecks: ui,
  });

  assert.deepEqual(report.checks.slice(-6), [
    'workflow-complete',
    'project-list',
    'ui-new-project-localpath-editor',
    'ui-transcript-download',
    'ui-manual-clip-download',
    'ui-new-project-upload-editor',
  ]);
  assert(!requestedPaths.includes('/api/test-control'));
  assert(!requestedPaths.includes('/api/settings'));
});
