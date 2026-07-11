import type { LiveProjectionPort } from '../ports/live-projection.port';
import type { ProgressProjectionRepository } from './record-progress.service';
export class RebuildLiveProjectionsService {
  constructor(
    private readonly projections: ProgressProjectionRepository,
    private readonly live: LiveProjectionPort,
  ) {}
  async execute(projectId: string) {
    for (const event of await this.projections.findActive(projectId))
      await this.live.publish(projectId, event);
  }
}
