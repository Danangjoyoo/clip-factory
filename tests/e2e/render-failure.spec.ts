import { expect, test } from '@playwright/test';

test('fake control remains deterministic across independent render requests', async ({
  request,
}) => {
  await request.post('/api/test-control', { data: { action: 'reset' } });
  const first = await request.post('/api/test-control', {
    data: {
      action: 'highlight',
      request: { transcript: 'fixture', instruction: 'find' },
    },
  });
  const second = await request.post('/api/test-control', {
    data: {
      action: 'highlight',
      request: { transcript: 'fixture', instruction: 'find' },
    },
  });
  expect((await first.json()).candidates).toEqual(
    (await second.json()).candidates,
  );
});
