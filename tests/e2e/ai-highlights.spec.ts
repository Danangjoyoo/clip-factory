import { expect, test } from '@playwright/test';

test('AI fake returns bounded ranked candidates with usage metadata', async ({
  request,
}) => {
  await request.post('/api/test-control', { data: { action: 'reset' } });
  await request.post('/api/test-control', {
    data: { action: 'configure', config: { maxCandidates: 3 } },
  });
  const response = await request.post('/api/test-control', {
    data: {
      action: 'highlight',
      request: {
        transcript: 'fixture transcript',
        instruction: 'find highlights',
        mediaPath: '/private/source.mp4',
      },
    },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({
    responseId: 'fake-response-1',
    model: 'fake-highlights-v1',
    pricingVersion: 'fake-2026-01',
    usage: { inputTokens: 120, outputTokens: 80 },
  });
  expect(body.candidates).toHaveLength(3);
  const audit = await request
    .get('/api/test-control')
    .then((result) => result.json());
  expect(audit.audit[0]).not.toHaveProperty('mediaPath');
});
