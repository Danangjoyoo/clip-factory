import { randomUUID } from 'node:crypto';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';

export interface RenderBatchPort {
  queue(workflowId: string, batchId: string, renderIds: readonly string[]): Promise<void>;
}

export interface QueueRenderBatchRequest {
  workflowId: string;
  batchId: string;
  renderIds: readonly string[];
}

export interface QueueRenderBatchResult {
  workflowId: string;
  batchId: string;
  queuedCount: number;
  queueItemId: string;
}

export class QueueRenderBatchError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export class QueueRenderBatchService {
  constructor(
    private readonly repository: RenderRepository,
    private readonly queuePort: RenderBatchPort,
  ) {}

  async execute(input: QueueRenderBatchRequest): Promise<QueueRenderBatchResult> {
    if (!input.renderIds.length) {
      throw new QueueRenderBatchError('EMPTY_BATCH');
    }

    const queued: string[] = [];
    for (const renderId of new Set(input.renderIds)) {
      const render = await this.repository.findById(renderId);
      if (!render) throw new QueueRenderBatchError('RENDER_NOT_FOUND');
      await this.repository.save(this._asQueued(render));
      queued.push(renderId);
    }

    if (!queued.length) throw new QueueRenderBatchError('NO_RENDER_TO_QUEUE');
    await this.queuePort.queue(input.workflowId, input.batchId, queued);
    return {
      workflowId: input.workflowId,
      batchId: input.batchId,
      queuedCount: queued.length,
      queueItemId: randomUUID(),
    };
  }

  private _asQueued(render: RenderEntityDto): RenderEntityDto {
    return {
      ...render,
      status: 'QUEUED',
      errorCode: null,
    };
  }
}
