import { afterEach, expect, it, vi } from 'vitest';

const adapterSnapshot = vi.hoisted(() => vi.fn());
const adapterEvents = vi.hoisted(() => vi.fn());
const adapterPublish = vi.hoisted(() => vi.fn());
const redisConnect = vi.hoisted(() => vi.fn());
const rebuildExecute = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: redisConnect,
  })),
}));

vi.mock(
  '../../../../../modules/jobs/adapters/persistence/repositories/prisma-progress-projection.repository',
  () => ({
    PrismaProgressProjectionRepository: class {},
  }),
);

vi.mock('../../../../../modules/jobs/application/services/rebuild-live-projections.service', () => ({
  RebuildLiveProjectionsService: class {
    execute() {
      return rebuildExecute();
    }
  },
}));

vi.mock('../../../../../modules/jobs/adapters/clients/redis/redis-live-projection.adapter', () => ({
  RedisLiveProjectionAdapter: class {
    snapshot = adapterSnapshot;
    publish = adapterPublish;
    events = adapterEvents;
  },
}));
import { GET } from './route';

afterEach(() => {
  vi.clearAllMocks();
  adapterSnapshot.mockReset();
  adapterEvents.mockReset();
  adapterPublish.mockReset();
  redisConnect.mockReset();
  rebuildExecute.mockClear();
  adapterEvents.mockImplementation(async function* () {});
});

it('rebuilds durable projections when redis snapshot is empty', async () => {
  adapterSnapshot.mockResolvedValue(null);
  adapterEvents.mockReturnValue([]);
  const response = await GET(
    new Request('http://example.com', {
      headers: { 'Last-Event-ID': '0-0' },
    }),
    {
      params: Promise.resolve({
        projectId: '00000000-0000-4000-8000-000000000000',
      }),
    },
  );
  expect(redisConnect).toHaveBeenCalledTimes(1);
  expect(rebuildExecute).toHaveBeenCalledTimes(1);
  expect(response).toBeInstanceOf(Response);
  await response.body?.cancel();
});

it('does not rebuild when redis already has a snapshot', async () => {
  adapterSnapshot.mockResolvedValue({
    projectId: 'p',
    workflowId: 'w',
    stage: 'TRANSCRIBE',
    progressBasisPoints: 0,
    eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' },
    completedUnits: 0,
    totalUnits: 10,
    unit: 'ITEMS',
    occurredAt: '2026-07-11T00:00:00.000Z',
  });
  adapterEvents.mockReturnValue([]);
  const response = await GET(new Request('http://example.com'), {
    params: Promise.resolve({
      projectId: '00000000-0000-4000-8000-000000000000',
    }),
  });
  expect(rebuildExecute).toHaveBeenCalledTimes(0);
  expect(response).toBeInstanceOf(Response);
  await response.body?.cancel();
});
