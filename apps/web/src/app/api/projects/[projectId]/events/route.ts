import { createClient } from 'redis';
import { RedisLiveProjectionAdapter } from '../../../../../modules/jobs/adapters/clients/redis/redis-live-projection.adapter';
import { ProgressSseController } from '../../../../../modules/jobs/delivery/http/progress-sse.controller';
const client = createClient({
  url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
});
let ready: Promise<unknown> | undefined;
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  if (!ready) ready = client.connect();
  await ready;
  return new ProgressSseController(
    new RedisLiveProjectionAdapter(client),
  ).stream(request, (await context.params).projectId);
}
