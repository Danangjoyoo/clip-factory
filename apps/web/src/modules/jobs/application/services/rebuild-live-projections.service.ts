import type { LiveProjectionPort } from '../ports/live-projection.port';
import type { ProgressProjectionRepository } from './record-progress.service';
export class RebuildLiveProjectionsService {
  private readonly terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;

  constructor(
    private readonly projections: ProgressProjectionRepository,
    private readonly live: LiveProjectionPort,
  ) {}
  async execute(projectId: string, now = new Date()) {
    for (const event of await this.projections.findActive(projectId)) {
      const heartbeat = new Date(event.heartbeatAt ?? event.occurredAt);
      const stale = now.getTime() - heartbeat.getTime() > 30_000;
      const terminal = this.terminalStatuses.includes(
        (event.status ?? '') as (typeof this.terminalStatuses)[number],
      );
      await this.live.publish(
        projectId,
        stale && !terminal
          ? { ...event, status: 'WORKER_OFFLINE', occurredAt: now.toISOString() }
          : event,
      );
    }
  }
}
