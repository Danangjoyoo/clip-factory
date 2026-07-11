import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

test('workflows are immutable, least privilege, and never deploy', async () => {
  const names = (await readdir('.github/workflows'))
    .filter((name) => name.endsWith('.yml'))
    .sort();
  assert.deepEqual(names, ['ci.yml', 'codeql.yml']);
  for (const name of names) {
    const source = await readFile(`.github/workflows/${name}`, 'utf8');
    const workflow = YAML.parse(source);
    assert.equal('pull_request_target' in (workflow.on ?? {}), false);
    assert.doesNotMatch(source, /uses:\s+[^\s]+@(?![a-f0-9]{40}(?:\s|$))/u);
    assert.doesNotMatch(
      source,
      /OPENAI_API_KEY|YOUTUBE|docker\/login-action|packages:\s*write/u,
    );
    assert.equal(
      Object.values(workflow.jobs ?? {}).some((job) => 'environment' in job),
      false,
    );
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    const commands = Object.values(workflow.jobs ?? {})
      .flatMap((job) => job.steps ?? [])
      .map((step) => String(step.run ?? ''))
      .join('\n');
    assert.doesNotMatch(
      commands,
      /(?:^|\s)(?:docker\s+(?:login|push)|npm\s+publish|pnpm\s+publish|gh\s+release|kubectl\s|helm\s+upgrade|terraform\s+apply)(?:\s|$)/u,
    );
    assert.equal(
      (commands.match(/pnpm db:migrate:deploy/gu) ?? []).length <= 1,
      true,
    );
  }
});

test('CI exposes every phase-one quality boundary', async () => {
  const workflow = YAML.parse(
    await readFile('.github/workflows/ci.yml', 'utf8'),
  );
  assert.deepEqual(Object.keys(workflow.jobs).sort(), [
    'architecture-contracts',
    'docker-build',
    'e2e',
    'integration',
    'media',
    'migrations',
    'web-quality',
    'worker-quality',
  ]);
});

test('CodeQL and Dependabot cover supported ecosystems', async () => {
  const codeql = YAML.parse(
    await readFile('.github/workflows/codeql.yml', 'utf8'),
  );
  assert.deepEqual(codeql.jobs.analyze.strategy.matrix.language.sort(), [
    'actions',
    'javascript-typescript',
    'python',
  ]);
  const dependabot = YAML.parse(
    await readFile('.github/dependabot.yml', 'utf8'),
  );
  assert.deepEqual(
    dependabot.updates.map((entry) => entry['package-ecosystem']).sort(),
    ['docker', 'github-actions', 'npm', 'pip'],
  );
});
