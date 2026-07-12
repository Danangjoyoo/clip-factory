import { describe, expect, it, vi } from 'vitest';
import { loadServerEnv, ServerEnvSchema } from './server-env';

describe('server environment', () => {
  it('reads only owned values from ambient process environment', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://local');
    vi.stubEnv('REDIS_URL', 'redis://local');
    vi.stubEnv('MINIO_ENDPOINT', 'http://127.0.0.1:9000');
    vi.stubEnv('MINIO_PUBLIC_ENDPOINT', 'http://127.0.0.1:9000');
    vi.stubEnv('MINIO_ACCESS_KEY', 'key');
    vi.stubEnv('MINIO_SECRET_KEY', 'secret');
    vi.stubEnv('TEMPORAL_ADDRESS', '127.0.0.1:7233');
    vi.stubEnv('INTERNAL_SERVICE_TOKEN', 'token');
    vi.stubEnv('CI', 'true');
    expect(loadServerEnv().DATABASE_URL).toBe('postgresql://local');
  });
  it('rejects unknown schema keys', () => {
    expect(() =>
      ServerEnvSchema.parse({ DATABASE_URL: 'x', UNKNOWN: 'y' }),
    ).toThrow();
  });
});
