#!/usr/bin/env node
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve } from 'node:path';
import process from 'node:process';

const defaultSample =
  process.env.CLIP_FACTORY_ACCEPTANCE_SAMPLE ??
  '/Users/mac/dev/projects/clipper/clip-factory/samples/what-is-branding.mp4';
const terminalStates = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const browserConsoleTypes = new Set(['error', 'warning']);

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

export function assertProjectAccepted(project) {
  if (!project?.id || project.status !== 'DRAFT')
    throw new Error('project submission did not return an accepted draft');
  if (project.source?.kind !== 'LOCAL_FILE')
    throw new Error('project submission did not retain local-file source');
}

export function assertFakeAudit(audit) {
  const requests = Array.isArray(audit) ? audit : [];
  if (requests.length !== 1)
    throw new Error('fake highlight audit did not record exactly one request');
  if ('mediaPath' in requests[0])
    throw new Error('fake highlight audit retained a media path');
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

async function launchChromium() {
  const { chromium } = await import('@playwright/test');
  return chromium.launch();
}

function assertBrowserClean(issues) {
  if (issues.length)
    throw new Error(
      `browser UI check failed: ${issues.slice(0, 5).join('; ')}`,
    );
}

function watchBrowser(page, baseUrl, issues) {
  const appOrigin = new URL(baseUrl).origin;
  page.on('console', (message) => {
    if (browserConsoleTypes.has(message.type()))
      issues.push(`${message.type()}: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes(':9000/')) return;
    issues.push(
      `request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`,
    );
  });
  page.on('response', (response) => {
    const url = response.url();
    const isAppApi =
      url.startsWith(appOrigin) && new URL(url).pathname.startsWith('/api/');
    const isObjectStore = url.includes(':9000/');
    if ((isAppApi || isObjectStore) && response.status() >= 400)
      issues.push(`HTTP ${response.status()}: ${url}`);
  });
}

export async function runUiChecks(options, launchBrowser = launchChromium) {
  const browser = await launchBrowser();
  const issues = [];
  try {
    const page = await browser.newPage();
    watchBrowser(page, options.baseUrl, issues);
    await page.goto(new URL('/projects/new', options.baseUrl).href, {
      waitUntil: 'networkidle',
    });
    if (
      (await page
        .getByRole('tab', { name: 'Local filepath' })
        .getAttribute('aria-selected')) !== 'true'
    )
      throw new Error('local filepath tab is not selected by default');
    await page.getByLabel('Project name').fill('integration-ui-localpath');
    await page.getByLabel('Video filepath').fill(options.sample);
    if (
      !(await page.getByRole('button', { name: 'Create project' }).isEnabled())
    )
      throw new Error('local filepath create button is disabled');
    await page.getByRole('button', { name: 'Create project' }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]+\/processing/u);

    await page.goto(new URL('/projects/new', options.baseUrl).href, {
      waitUntil: 'networkidle',
    });
    await page.getByRole('tab', { name: 'Upload file' }).click();
    await page.getByLabel('Project name').fill('integration-ui-upload');
    await page.getByLabel('Video file').setInputFiles(options.sample);
    if (
      !(await page.getByRole('button', { name: 'Create project' }).isEnabled())
    )
      throw new Error('upload create button is disabled');
    await page.getByRole('button', { name: 'Create project' }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]+\/processing/u);
    assertBrowserClean(issues);
    return ['ui-new-project-localpath', 'ui-new-project-upload'];
  } finally {
    await browser.close();
  }
}

export async function run(
  options = parseArgs(process.argv.slice(2)),
  env = process.env,
  dependencies = {},
) {
  const http = dependencies.request ?? request;
  const uiChecks = dependencies.uiChecks ?? runUiChecks;
  assertFakeMode(env, options.mode);
  await validateSample(options.sample);
  const report = { mode: 'fake', sample: basename(options.sample), checks: [] };
  const health = await http(options.baseUrl, '/api/health');
  if (health.status !== 'HEALTHY')
    throw new Error('service health is not HEALTHY');
  report.checks.push('service-health');
  await http(options.baseUrl, '/api/test-control', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'reset' }),
  });
  const highlight = await http(options.baseUrl, '/api/test-control', {
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
  const control = await http(options.baseUrl, '/api/test-control');
  assertFakeAudit(control.audit);
  report.checks.push('fake-audit');
  const project = await http(options.baseUrl, '/api/projects', {
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
  assertProjectAccepted(project);
  report.checks.push('project-submission');
  const projects = await http(options.baseUrl, '/api/projects');
  if (
    !Array.isArray(projects) ||
    !projects.some((item) => item.id === project.id)
  )
    throw new Error('submitted project did not appear in project list');
  report.checks.push('project-list');
  report.checks.push(...(await uiChecks(options)));
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
