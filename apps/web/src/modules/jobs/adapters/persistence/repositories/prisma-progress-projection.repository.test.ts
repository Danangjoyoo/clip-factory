import { expect, it, vi } from 'vitest';
vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  process.env.MINIO_ENDPOINT ??= 'http://localhost:9000';
  process.env.MINIO_ACCESS_KEY ??= 'test';
  process.env.MINIO_SECRET_KEY ??= 'test';
  process.env.TEMPORAL_ADDRESS ??= 'localhost:7233';
  process.env.INTERNAL_SERVICE_TOKEN ??= 'test';
});
import { PrismaProgressProjectionRepository } from './prisma-progress-projection.repository';

it('writes durable progress and rejects an older heartbeat', async () => {
  const rows: any[] = [];
  const db: any = {
    jobProjection: {
      findFirst: async () => rows[0] ?? null,
      upsert: async ({ create, update }: any) => {
        rows[0] = { ...rows[0], ...create, ...update, updatedAt: new Date() };
      },
      findMany: async () => rows,
    },
  };
  const repository = new PrismaProgressProjectionRepository(db);
  const event = {
    projectId: 'p',
    workflowId: 'w',
    stage: 'X',
    progressBasisPoints: 50,
    eta: { lowSeconds: 1, highSeconds: 2, confidence: 'LOW' as const },
    completedUnits: 1,
    totalUnits: 2,
    unit: 'ITEMS',
    occurredAt: '2026-07-11T00:00:10Z',
  };
  await repository.upsert(event);
  await repository.upsert({
    ...event,
    progressBasisPoints: 10,
    occurredAt: '2026-07-11T00:00:01Z',
  });
  expect(rows[0].progressBasisPoints).toBe(50);
});

it('does not regress a terminal projection', async () => {
  const row: any = {
    status: 'COMPLETED',
    lastHeartbeatAt: new Date('2026-07-11T00:00:10Z'),
  };
  const db: any = {
    jobProjection: {
      findFirst: async () => row,
      upsert: async () => {
        throw new Error('must not update terminal row');
      },
      findMany: async () => [],
    },
  };
  await new PrismaProgressProjectionRepository(db).upsert({
    projectId: 'p',
    workflowId: 'w',
    stage: 'X',
    progressBasisPoints: 1,
    eta: { lowSeconds: null, highSeconds: null, confidence: 'LOW' },
    completedUnits: 1,
    totalUnits: 2,
    unit: 'ITEMS',
    occurredAt: '2026-07-11T00:00:11Z',
  });
  expect(row.status).toBe('COMPLETED');
});
