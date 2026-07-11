import { postgres } from '../support/postgres';
import { connectRedis } from '../support/redis';
import { ensureBucket } from '../support/minio';
export async function waitForServices() { await postgres.query('select 1'); await connectRedis(); await ensureBucket(); }
