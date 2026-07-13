import { afterAll } from 'vitest';
import { postgres } from '../support/postgres';
import { redis } from '../support/redis';
import { setIntegrationEnvDefaults } from './env-defaults';

setIntegrationEnvDefaults();

afterAll(async () => {
  await postgres.end();
  if (redis.isOpen) await redis.quit();
});
