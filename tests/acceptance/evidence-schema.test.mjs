import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('acceptance evidence has all fourteen criteria and no secrets', async () => {
  const path = '.artifacts/acceptance/latest/evidence.json';
  await access(path).catch(() => {});
  const evidence = JSON.parse(
    await readFile(path, 'utf8').catch(() => '{"criteria":[]}'),
  );
  assert.deepEqual(
    evidence.criteria.map((item) => item.id),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );
  assert.equal(
    evidence.criteria.every((item) =>
      ['PASS', 'MANUAL_PASS', 'NOT_RUN'].includes(item.status),
    ),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /OPENAI_API_KEY|sk-[A-Za-z0-9_-]+|\/Users\/|transcriptText|rawMedia/u,
  );
});
