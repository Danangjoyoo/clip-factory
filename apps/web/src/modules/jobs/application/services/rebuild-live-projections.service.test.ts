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

it('projects stale workers as offline after thirty seconds', async () => {
  const event = {
    projectId: 'p', workflowId: 'w', stage: 'X', progressBasisPoints: 10,
    eta: { lowSeconds: 1, highSeconds: 2, confidence: 'LOW' as const },
    completedUnits: 1, totalUnits: 10, unit: 'ITEMS',
    occurredAt: '2026-07-11T00:00:00.000Z', heartbeatAt: '2026-07-11T00:00:00.000Z',
  };
  const published: any[] = [];
  await new RebuildLiveProjectionsService(
    { findActive: async () => [event], upsert: async () => {} },
    { publish: async (_p, e) => void published.push(e), snapshot: async () => null, events: async function* () {} },
  ).execute('p', new Date('2026-07-11T00:00:31.000Z'));
  expect(published[0].status).toBe('WORKER_OFFLINE');
});

it('keeps failed jobs terminal when stale', async () => {
  const event = {
    projectId: 'p', workflowId: 'w', stage: 'X', progressBasisPoints: 10,
    eta: { lowSeconds: 1, highSeconds: 2, confidence: 'LOW' as const },
    completedUnits: 1, totalUnits: 10, unit: 'ITEMS', status: 'FAILED',
    occurredAt: '2026-07-11T00:00:00.000Z', heartbeatAt: '2026-07-11T00:00:00.000Z',
  };
  const published: any[] = [];
  await new RebuildLiveProjectionsService(
    { findActive: async () => [event], upsert: async () => {} },
    { publish: async (_p, e) => void published.push(e), snapshot: async () => null, events: async function* () {} },
  ).execute('p', new Date('2026-07-11T00:00:31.000Z'));
  expect(published[0].status).toBe('FAILED');
});
