import { postgres } from '../support/postgres';
import { redis } from '../support/redis';
export default async function globalTeardown() {
  await postgres.end();
  if (redis.isOpen) await redis.quit();
}
