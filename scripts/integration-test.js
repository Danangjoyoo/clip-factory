#!/usr/bin/env node
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve } from 'node:path';
import process from 'node:process';

const defaultSample =
  process.env.CLIP_FACTORY_ACCEPTANCE_SAMPLE ??
  '/Users/mac/dev/projects/clipper/clip-factory/samples/what-is-branding.mp4';
const terminalStates = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export function parseArgs(argv) {
  const options = {
    mode: 'fake',
    sample: defaultSample,
    baseUrl: 'http://127.0.0.1:3000',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--live' || value === '--mode=live') options.mode = 'live';
    else if (value === '--fake' || value === '--mode=fake')
      options.mode = 'fake';
    else if (value === '--sample') options.sample = resolve(argv[++index]);
    else if (value.startsWith('--sample='))
      options.sample = resolve(value.slice(9));
    else if (value === '--base-url') options.baseUrl = argv[++index];
    else if (value.startsWith('--base-url=')) options.baseUrl = value.slice(11);
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

export function assertFakeMode(
  env = process.env,
  requestedMode = env.OPENAI_ADAPTER ?? 'fake',
) {
  if (requestedMode !== 'fake' || env.OPENAI_ADAPTER === 'live')
    throw new Error(
      'Integration gate is fake mode only; refusing live OpenAI mode before network requests',
    );
}

export async function validateSample(sample) {
  const info = await stat(sample).catch(() => null);
  if (!info?.isFile() || info.size === 0)
    throw new Error('sample must be a readable regular file');
  await access(sample, constants.R_OK);
}

export function redactReport(value, key = '') {
  if (
    /(?:secret|token|authorization|cookie|password|credential|apiKey)/iu.test(
      key,
    )
  )
    return '[REDACTED_SECRET]';
  if (/(?:path|filename|source|locator|resolved)/iu.test(key))
    return '[REDACTED_PATH]';
  if (/(?:transcript|caption|prompt|response|message|word|text)/iu.test(key))
    return '[REDACTED_TEXT]';
  if (Array.isArray(value)) return value.map((item) => redactReport(item, key));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        redactReport(item, name),
      ]),
    );
  if (
    typeof value === 'string' &&
    (/(?:sk-[\w-]+|Bearer\s+\S+)/u.test(value) ||
      /(?:\/Users\/|file:\/\/|[A-Za-z]:\\)/u.test(value))
  )
    return '[REDACTED]';
  return value;
}

export function assertTerminalState(job) {
  if (!terminalStates.has(job?.status))
    throw new Error('job did not reach a terminal state');
}

async function request(baseUrl, path, init) {
  const response = await fetch(new URL(path, baseUrl), init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return body;
}

export async function run(
  options = parseArgs(process.argv.slice(2)),
  env = process.env,
) {
  assertFakeMode(env, options.mode);
  await validateSample(options.sample);
  const report = { mode: 'fake', sample: basename(options.sample), checks: [] };
  const health = await request(options.baseUrl, '/api/health');
  if (health.status !== 'HEALTHY')
    throw new Error('service health is not HEALTHY');
  report.checks.push('service-health');
  await request(options.baseUrl, '/api/test-control', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'reset' }),
  });
  const highlight = await request(options.baseUrl, '/api/test-control', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'highlight',
      request: {
        transcript: 'fixture transcript',
        instruction: 'find highlights',
        mediaPath: options.sample,
      },
    }),
  });
  if (
    highlight.model !== 'fake-highlights-v1' ||
    !Array.isArray(highlight.candidates)
  )
    throw new Error('fake highlight contract failed');
  report.checks.push('fake-highlights');
  const project = await request(options.baseUrl, '/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'integration-gate',
      mode: 'MANUAL',
      language: 'en',
      maxClipSeconds: 30,
      platform: 'YOUTUBE_SHORTS',
      source: { type: 'FILEPATH', path: options.sample },
    }),
  });
  if (!project.id) throw new Error('project submission did not return an id');
  report.checks.push('project-submission');
  const safe = redactReport({
    projectId: project.id,
    model: highlight.model,
    costMicrousd: '0',
    source: options.sample,
    transcript: 'fixture transcript',
  });
  report.result = safe;
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .then((report) => console.log(JSON.stringify({ ok: true, ...report })))
    .catch((error) => {
      console.error(`integration gate: FAIL — ${error.message}`);
      process.exitCode = 1;
    });
}
