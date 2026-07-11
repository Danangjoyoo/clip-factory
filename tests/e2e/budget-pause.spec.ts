import { expect, test } from '@playwright/test';

test('AI fake can be configured to return no candidates at a budget boundary', async ({
  request,
}) => {
  await request.post('/api/test-control', { data: { action: 'reset' } });
  await request.post('/api/test-control', {
    data: { action: 'configure', config: { maxCandidates: 0 } },
  });
  const response = await request.post('/api/test-control', {
    data: {
      action: 'highlight',
      request: { transcript: 'fixture', instruction: 'find' },
    },
  });
  expect(response.ok()).toBe(true);
  expect((await response.json()).candidates).toHaveLength(0);
});
