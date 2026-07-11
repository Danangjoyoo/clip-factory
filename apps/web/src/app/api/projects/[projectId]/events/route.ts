import { createClient } from 'redis';
import { RedisLiveProjectionAdapter } from '../../../../../modules/jobs/adapters/clients/redis/redis-live-projection.adapter';
import { PrismaProgressProjectionRepository } from '../../../../../modules/jobs/adapters/persistence/repositories/prisma-progress-projection.repository';
import { RebuildLiveProjectionsService } from '../../../../../modules/jobs/application/services/rebuild-live-projections.service';
import { ProgressSseController } from '../../../../../modules/jobs/delivery/http/progress-sse.controller';
const client = createClient({
  url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
});
let ready: Promise<unknown> | undefined;
const rebuildByProject = new Map<string, Promise<void>>();
const durableProjectionRepository = new PrismaProgressProjectionRepository();
const redisProjectionAdapter = new RedisLiveProjectionAdapter(client);

async function rebuildLiveProjection(projectId: string) {
  const existing = await redisProjectionAdapter.snapshot(projectId);
  if (existing) return;
  if (rebuildByProject.has(projectId)) return rebuildByProject.get(projectId);
  const rebuild = new RebuildLiveProjectionsService(
    durableProjectionRepository,
    redisProjectionAdapter,
  ).execute(projectId)
    .finally(() => {
      rebuildByProject.delete(projectId);
    });
  rebuildByProject.set(projectId, rebuild);
  await rebuild;
}

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
  await rebuildLiveProjection(projectId);
  return new ProgressSseController(
    redisProjectionAdapter,
  ).stream(request, projectId);
}
