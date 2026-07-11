import { expect, it } from 'vitest';
import { RebuildLiveProjectionsService } from './rebuild-live-projections.service';

it('rebuilds live projections from durable active rows', async () => {
  const event = {
    projectId: 'p',
    workflowId: 'w',
    stage: 'X',
    progressBasisPoints: 0,
    eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' as const },
    completedUnits: 0,
    totalUnits: 1,
    unit: 'ITEMS',
    occurredAt: new Date().toISOString(),
  };
  const published: unknown[] = [];
  await new RebuildLiveProjectionsService(
    { findActive: async () => [event], upsert: async () => {} },
    {
      publish: async (_p, e) => void published.push(e),
      snapshot: async () => null,
      events: async function* () {},
    },
  ).execute('p');
  expect(published).toEqual([event]);
});
