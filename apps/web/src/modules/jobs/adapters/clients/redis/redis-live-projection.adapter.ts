import type { LiveProjectionPort } from '../../../application/ports/live-projection.port';
import type { ProgressPresentation } from '../../../domain/progress';
import type { RedisClientType } from 'redis';
export class RedisLiveProjectionAdapter implements LiveProjectionPort {
  constructor(private readonly client: RedisClientType) {}
  private async connected() {
    if (this.client.isOpen) return;
    try {
      await this.client.connect();
    } catch (error) {
      throw new Error('REDIS_UNAVAILABLE', { cause: error });
    }
  }
  async publish(projectId: string, event: ProgressPresentation) {
    await this.connected();
    await this.client.set(`progress:${projectId}`, JSON.stringify(event), {
      EX: 86400,
    });
    await this.client.xAdd(`progress-events:${projectId}`, '*', {
      event: JSON.stringify(event),
    });
    await this.client.xTrim(`progress-events:${projectId}`, 'MAXLEN', 1000);
  }
  async snapshot(projectId: string) {
    await this.connected();
    const value = await this.client.get(`progress:${projectId}`);
    return value ? (JSON.parse(value) as ProgressPresentation) : null;
  }
  async *events(projectId: string, afterId: string, signal?: AbortSignal) {
    await this.connected();
    let cursor = afterId || '0-0';
    while (!signal?.aborted) {
      const rows = await this.client.xRead(
        { key: `progress-events:${projectId}`, id: cursor },
        { BLOCK: 15000, COUNT: 100 },
      );
      if (!rows) {
        yield { id: '', comment: true };
        continue;
      }
      for (const stream of rows)
        for (const message of stream.messages) {
          const [id, fields] = Array.isArray(message)
            ? message
            : [message.id, message.message];
          cursor = id;
          yield {
            id,
            event: JSON.parse(String(fields.event)) as ProgressPresentation,
          };
        }
    }
  }
}
