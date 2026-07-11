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
  const projectId = (await context.params).projectId;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      projectId,
    )
  )
    return Response.json({ code: 'INVALID_PROJECT_ID' }, { status: 400 });
  if (!ready) ready = client.connect();
  await ready;
  return new ProgressSseController(
    new RedisLiveProjectionAdapter(client),
  ).stream(request, projectId);
}
