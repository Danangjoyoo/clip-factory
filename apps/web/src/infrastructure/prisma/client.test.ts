import { beforeAll, describe, expect, it, vi } from 'vitest';

let prisma: typeof import('./client').prisma;

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://local');
  vi.stubEnv('REDIS_URL', 'redis://local');
  vi.stubEnv('MINIO_ENDPOINT', 'http://127.0.0.1:9000');
  vi.stubEnv('MINIO_PUBLIC_ENDPOINT', 'http://127.0.0.1:9000');
  vi.stubEnv('MINIO_ACCESS_KEY', 'key');
  vi.stubEnv('MINIO_SECRET_KEY', 'secret');
  vi.stubEnv('TEMPORAL_ADDRESS', '127.0.0.1:7233');
  vi.stubEnv('INTERNAL_SERVICE_TOKEN', 'token');
  ({ prisma } = await import('./client'));
});

describe('prisma client', () => {
  it('exposes the generated project delegate', () => {
    expect(prisma.project).toBeDefined();
  });
});
