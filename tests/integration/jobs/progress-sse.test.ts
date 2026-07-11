import { expect, it } from 'vitest';
import { ProgressSseController } from '../../../apps/web/src/modules/jobs/delivery/http/progress-sse.controller';

it('reconnects from Last-Event-ID and emits keepalive', async () => {
  let cursor = '';
  const response = await new ProgressSseController({
    publish: async () => {}, snapshot: async () => null,
    events: async function* (_project, after) {
      cursor = after; yield { id: '', comment: true };
      yield { id: '42-0', event: { projectId: 'p', workflowId: 'w', stage: 'X', progressBasisPoints: 1, eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' as const }, completedUnits: 1, totalUnits: 2, unit: 'ITEMS', occurredAt: new Date().toISOString() } };
    },
  }).stream(new Request('http://test', { headers: { 'Last-Event-ID': '41-0' } }), 'p');
  expect(cursor).toBe('41-0');
  expect(await response.text()).toContain(': keepalive');
});
