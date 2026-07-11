import type { LiveProjectionPort } from '../../../application/ports/live-projection.port';
import type { ProgressPresentation } from '../../../domain/progress';
import type { RedisClientType } from 'redis';
export class RedisLiveProjectionAdapter implements LiveProjectionPort {
  constructor(private readonly client: RedisClientType) {}
  async publish(projectId: string, event: ProgressPresentation) {
    await this.client.set(`progress:${projectId}`, JSON.stringify(event), {
      EX: 86400,
    });
    await this.client.xAdd(`progress-events:${projectId}`, '*', {
      event: JSON.stringify(event),
    });
    await this.client.xTrim(`progress-events:${projectId}`, 'MAXLEN', 1000);
  }
  async snapshot(projectId: string) {
    const value = await this.client.get(`progress:${projectId}`);
    return value ? (JSON.parse(value) as ProgressPresentation) : null;
  }
  async *events(projectId: string, afterId: string, signal?: AbortSignal) {
    let cursor = afterId || '0-0';
    while (!signal?.aborted) {
      const rows = await this.client.xRead(
        { key: `progress-events:${projectId}`, id: cursor },
        { BLOCK: 15000, COUNT: 100 },
      );
      if (!rows) continue;
      for (const stream of rows)
        for (const [id, fields] of stream.messages) {
          cursor = id;
          yield {
            id,
            event: JSON.parse(String(fields.event)) as ProgressPresentation,
          };
        }
    }
  }
}
