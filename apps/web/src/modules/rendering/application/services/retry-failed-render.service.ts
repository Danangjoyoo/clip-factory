import { randomUUID } from 'node:crypto';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';

export interface RetryFailedRenderResult {
  originalRenderId: string;
  retryRenderId: string;
}

export class RetryFailedRenderError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export class RetryFailedRenderService {
  constructor(private readonly repository: RenderRepository) {}

  async execute(renderId: string): Promise<RenderEntityDto> {
    const original = await this.repository.findById(renderId);
    if (!original) throw new RetryFailedRenderError('RENDER_NOT_FOUND');
    if (original.status !== 'FAILED') throw new RetryFailedRenderError('RENDER_NOT_FAILED');

    const retry: RenderEntityDto = {
      ...original,
      renderId: randomUUID(),
      retryOfRenderId: original.renderId,
      status: 'QUEUED',
      outputKey: null,
      srtObjectKey: null,
      errorCode: null,
    };
    await this.repository.save(retry);
    return retry;
  }

  static resultOf(original: RenderEntityDto, retry: RenderEntityDto): RetryFailedRenderResult {
    return { originalRenderId: original.renderId, retryRenderId: retry.renderId };
  }
}
