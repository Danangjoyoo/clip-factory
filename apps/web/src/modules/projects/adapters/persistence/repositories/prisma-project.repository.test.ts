import { expect, it, vi } from 'vitest';
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://localhost/test';
  process.env.REDIS_URL = 'redis://localhost';
  process.env.MINIO_ENDPOINT = 'http://localhost:9000';
  process.env.MINIO_PUBLIC_ENDPOINT = 'http://localhost:9000';
  process.env.MINIO_ACCESS_KEY = 'minio';
  process.env.MINIO_SECRET_KEY = 'miniosecret';
  process.env.TEMPORAL_ADDRESS = 'localhost:7233';
  process.env.INTERNAL_SERVICE_TOKEN = 'test';
});
import { PrismaProjectRepository } from './prisma-project.repository';
it('writes a converted project record through the transaction model', async () => {
  const row = {
    id: 'p1',
    name: 'Demo',
    mode: 'MANUAL',
    languageTag: 'en',
    defaultMaxClipSeconds: 60,
    defaultPlatformPreset: 'TIKTOK',
    status: 'DRAFT',
    activeWorkflowId: null,
    openaiSpendMicrousd: 0n,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;
  const create = vi.fn().mockResolvedValue(row);
  const result = await new PrismaProjectRepository().insert(
    {
      name: 'Demo',
      mode: 'MANUAL',
      languageTag: 'en',
      defaultMaxClipSeconds: 60,
      defaultPlatformPreset: 'TIKTOK',
      status: 'DRAFT',
      activeWorkflowId: null,
      openaiSpendMicrousd: 0n,
    },
    { project: { create } },
  );
  expect(create).toHaveBeenCalledWith({
    data: {
      name: 'Demo',
      mode: 'MANUAL',
      languageTag: 'en',
      defaultMaxClipSeconds: 60,
      defaultPlatformPreset: 'TIKTOK',
      status: 'DRAFT',
      activeWorkflowId: null,
      openaiSpendMicrousd: 0n,
    },
  });
  expect(result.id).toBe('p1');
});
