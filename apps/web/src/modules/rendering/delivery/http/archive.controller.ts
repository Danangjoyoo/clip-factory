import type { CreateArchiveService } from '../../application/services/create-archive.service';
import { CreateArchiveError } from '../../application/services/create-archive.service';

export class ArchiveController {
  constructor(private readonly service: CreateArchiveService) {}

  async create(projectId: string, input: unknown) {
    if (!this._isObject(input) || !Array.isArray(input.renders) || typeof input.archiveId !== 'string' || !input.archiveId.trim()) {
      return Response.json({ code: 'INVALID_ARCHIVE_REQUEST' }, { status: 422 });
    }
    try {
      const result = await this.service.execute({
        projectId,
        archiveId: input.archiveId,
        renders: input.renders.map((item: unknown) => this._mapRender(item)),
      });
      return Response.json({ archiveKey: result.archiveKey }, { status: 201 });
    } catch (error) {
      if (error instanceof CreateArchiveError) {
        return Response.json({ code: error.code }, {
          status: error.code === 'NO_SUCCESSFUL_RENDERS' ? 409 : 400,
        });
      }
      throw error;
    }
  }

  private _mapRender(item: unknown) {
    if (!this._isObject(item)) throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    const title = item.title;
    if (typeof item.renderId !== 'string' || !item.renderId) {
      throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    }
    if (typeof item.outputKey !== 'string' || !item.outputKey) {
      throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    }
    if (typeof item.sortOrder !== 'number' || item.sortOrder < 0) {
      throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    }
    if (title !== null && typeof title !== 'string') {
      throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    }
    if (item.srtObjectKey !== null && item.srtObjectKey !== undefined && typeof item.srtObjectKey !== 'string') {
      throw new CreateArchiveError('INVALID_RENDER_ENTRY');
    }
    return {
      renderId: item.renderId,
      title: title,
      sortOrder: item.sortOrder,
      outputKey: item.outputKey,
      srtObjectKey: item.srtObjectKey ?? null,
    };
  }

  private _isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
