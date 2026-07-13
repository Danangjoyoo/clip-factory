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
import { PrismaSourceAssetRepository } from './prisma-source-asset.repository';
it('writes converted source fields and preserves nullable values', async () => {
  const row = {
    id: 's1',
    projectId: 'p1',
    kind: 'LOCAL_FILE',
    displayPath: '/tmp/a.mov',
    resolvedPath: null,
    objectKey: null,
    objectVersionId: null,
    objectSha256: null,
    sizeBytes: null,
    modifiedAt: null,
    fingerprint: null,
    probeJson: null,
    health: 'UNKNOWN',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;
  const create = vi.fn().mockResolvedValue(row);
  const result = await new PrismaSourceAssetRepository().insert(
    {
      projectId: 'p1',
      kind: 'LOCAL_FILE',
      displayPath: '/tmp/a.mov',
      resolvedPath: null,
      objectKey: null,
      objectVersionId: null,
      objectSha256: null,
      sizeBytes: null,
      modifiedAt: null,
      fingerprint: null,
      probe: null,
      health: 'UNKNOWN',
    },
    { sourceAsset: { create } },
  );
  expect(create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      projectId: 'p1',
      displayPath: '/tmp/a.mov',
      probeJson: expect.anything(),
    }),
  });
  expect(result.probe).toBeNull();
});

it('converts nested probe metadata without relying on a type assertion', async () => {
  const create = vi.fn().mockResolvedValue({
    id: 's1',
    projectId: 'p1',
    kind: 'LOCAL_FILE',
    displayPath: '/tmp/a.mov',
    resolvedPath: null,
    objectKey: null,
    objectVersionId: null,
    objectSha256: null,
    sizeBytes: null,
    modifiedAt: null,
    fingerprint: null,
    probeJson: { duration: 2, streams: [{ codec: 'h264' }] },
    health: 'UNKNOWN',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await new PrismaSourceAssetRepository().insert(
    {
      projectId: 'p1',
      kind: 'LOCAL_FILE',
      displayPath: '/tmp/a.mov',
      resolvedPath: null,
      objectKey: null,
      objectVersionId: null,
      objectSha256: null,
      sizeBytes: null,
      modifiedAt: null,
      fingerprint: null,
      probe: { duration: 2, streams: [{ codec: 'h264' }] },
      health: 'UNKNOWN',
    },
    { sourceAsset: { create } },
  );
  expect(create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      probeJson: { duration: 2, streams: [{ codec: 'h264' }] },
    }),
  });
});
