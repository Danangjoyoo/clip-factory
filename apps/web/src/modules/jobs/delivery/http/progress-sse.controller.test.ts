import { expect, it } from 'vitest';
import { ProgressSseController } from './progress-sse.controller';

it('honors Last-Event-ID and emits keepalive comments', async () => {
  let after = '';
  const response = await new ProgressSseController({
    publish: async () => {},
    snapshot: async () => null,
    events: async function* (_p, id) {
      after = id;
      yield { id: '', comment: true };
      yield {
        id: '42-0',
        event: {
          projectId: '00000000-0000-4000-8000-000000000000',
          workflowId: '00000000-0000-4000-8000-000000000001',
          stage: 'X',
          progressBasisPoints: 0,
          eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' },
          completedUnits: 0,
          totalUnits: 1,
          unit: 'ITEMS',
          occurredAt: new Date().toISOString(),
        },
      };
    },
  }).stream(
    new Request('http://test', { headers: { 'Last-Event-ID': '41-0' } }),
    '00000000-0000-4000-8000-000000000000',
  );
  expect(after).toBe('41-0');
  expect(await response.text()).toContain(': keepalive');
});

it('closes once when abort races stream cleanup', async () => {
  const aborter = new AbortController();
  const response = await new ProgressSseController({
    publish: async () => {},
    snapshot: async () => null,
    events: async function* (_project, _after, signal) {
      await new Promise<void>((resolve) =>
        signal?.addEventListener('abort', () => resolve(), { once: true }),
      );
    },
  }).stream(new Request('http://test', { signal: aborter.signal }), 'project');

  const reader = response.body!.getReader();
  aborter.abort();
  await expect(reader.read()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});
