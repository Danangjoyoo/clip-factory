import { expect, test } from '@playwright/test';

test('fake control state can be read after reconnect', async ({ request }) => {
  await request.post('/api/test-control', { data: { action: 'reset' } });
  const response = await request.get('/api/test-control');
  expect(response.ok()).toBe(true);
  expect((await response.json()).state.maxCandidates).toBe(3);
});
