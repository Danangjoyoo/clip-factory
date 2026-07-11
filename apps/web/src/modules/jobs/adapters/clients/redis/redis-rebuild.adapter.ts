export class RedisRebuildAdapter {
  constructor(private readonly redis: { set(key: string, value: string): Promise<unknown> }) {}
  rebuild(projectId: string, events: unknown[]) {
    return this.redis.set(`project:${projectId}:recovery`, JSON.stringify(events));
  }
}
