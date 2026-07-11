import { describe, expect, it } from 'vitest';
import { postgres } from './support/postgres';
import { connectRedis } from './support/redis';
import { ensureBucket } from './support/minio';
import { temporalHealth } from './support/temporal';
import { integrationEnabled } from './support/test-environment';
describe.skipIf(!integrationEnabled)('infrastructure', () => {
  it('starts all dependencies', async () => {
    expect((await postgres.query('select 1')).rowCount).toBe(1);
    expect(await (await connectRedis()).ping()).toBe('PONG');
    await ensureBucket();
    expect(await temporalHealth()).toBe(true);
  });
});
