import { describe, expect, it } from 'vitest';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';
import {
  RetryFailedRenderError,
  RetryFailedRenderService,
} from './retry-failed-render.service';

const SOURCE_FILE: RenderEntityDto = {
  version: '1.0.0',
  renderId: 'render-1',
  clipId: 'clip-1',
  projectId: 'project-1',
  source: {
    kind: 'LOCAL_FILE',
    sourceAssetId: 'source-1',
    fingerprint: 'fp',
    sizeBytes: 120,
    modifiedAt: '2026-07-11T00:00:00Z',
  },
  canvas: { width: 1080, height: 1920 },
  range: { startMs: 0, endMs: 1000 },
  cropTrack: [],
  captions: [],
  captionDocument: { version: 1, languageTag: 'en', cues: [] },
  style: {
    version: 1,
    fontFamily: 'Inter',
    fontSizePx: 24,
    textColor: '#fff',
    outlineColor: '#000',
    backgroundColor: '#000',
    activeWordColor: '#fff',
    verticalPositionMicros: 100000,
    maxWordsPerLine: 5,
    activeWordEmphasis: true,
  },
  title: 'My Clip',
  encoder: {
    strategy: 'SOFTWARE',
    videoCodec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
  },
  platformPreset: 'YOUTUBE_SHORTS',
  status: 'FAILED',
  errorCode: 'RENDER_FAILED',
  outputKey: null,
  srtObjectKey: null,
};

class MemoryRenderRepository implements RenderRepository {
  private readonly rows = new Map<string, RenderEntityDto>();

  constructor(initial: readonly RenderEntityDto[] = []) {
    for (const item of initial) {
      this.rows.set(item.renderId, item);
    }
  }

  findById(id: string) {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  async save(render: RenderEntityDto) {
    this.rows.set(render.renderId, render);
    return render;
  }

  all(): readonly RenderEntityDto[] {
    return [...this.rows.values()];
  }
}

describe('RetryFailedRenderService', () => {
  it('creates a new queued retry only for failed rows', async () => {
    const repository = new MemoryRenderRepository([SOURCE_FILE]);
    const service = new RetryFailedRenderService(repository);

    const retry = await service.execute(SOURCE_FILE.renderId);

    expect(retry.status).toBe('QUEUED');
    expect(retry.retryOfRenderId).toBe(SOURCE_FILE.renderId);
    expect(retry.renderId).not.toBe(SOURCE_FILE.renderId);
    expect(retry.outputKey).toBeNull();
    expect(retry.srtObjectKey).toBeNull();
    expect(retry.errorCode).toBeNull();

    const rows = repository.all();
    expect(rows).toHaveLength(2);
    expect(rows.find((item) => item.renderId === SOURCE_FILE.renderId)?.status).toBe(
      'FAILED',
    );
  });

  it('rejects non-failed render retries', async () => {
    const repository = new MemoryRenderRepository([
      { ...SOURCE_FILE, renderId: 'render-2', status: 'SUCCEEDED' },
    ]);
    const service = new RetryFailedRenderService(repository);

    await expect(service.execute('render-2')).rejects.toBeInstanceOf(
      RetryFailedRenderError,
    );
    expect((await repository.findById('render-2'))?.status).toBe('SUCCEEDED');
  });

  it('reports a missing-render error', async () => {
    const service = new RetryFailedRenderService(new MemoryRenderRepository());
    await expect(service.execute('nope')).rejects.toMatchObject({
      code: 'RENDER_NOT_FOUND',
    });
  });

  it('returns mapping metadata', () => {
    const original = { ...SOURCE_FILE, renderId: 'a' };
    const retry = { ...SOURCE_FILE, renderId: 'b', retryOfRenderId: original.renderId };
    const result = RetryFailedRenderService.resultOf(original, retry);

    expect(result).toEqual({
      originalRenderId: 'a',
      retryRenderId: 'b',
    });
  });
});
