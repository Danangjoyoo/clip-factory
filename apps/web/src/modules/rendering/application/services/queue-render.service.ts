import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';
export interface RenderBatchPort { queue(workflowId: string, batchId: string, renderIds: readonly string[]): Promise<void>; }
export class QueueRenderService {
  constructor(private readonly repository: RenderRepository, private readonly queue: RenderBatchPort) {}
  async execute(render: RenderEntityDto, workflowId: string, batchId: string) {
    if (render.range.endMs <= render.range.startMs) throw new Error('INVALID_CLIP_RANGE');
    const saved = await this.repository.save({ ...render, status: 'QUEUED' });
    await this.queue.queue(workflowId, batchId, [saved.renderId]);
    return saved;
  }
}
