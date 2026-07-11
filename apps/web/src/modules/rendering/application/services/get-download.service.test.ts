import { describe, expect, it } from 'vitest';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';
import { GetDownloadError, GetDownloadService } from './get-download.service';

const SAMPLE_RENDER: RenderEntityDto = {
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
  status: 'SUCCEEDED',
  outputKey: 'videos/output.mp4',
  srtObjectKey: null,
};

class MemoryRenderRepository implements RenderRepository {
  constructor(private readonly rows: ReadonlyMap<string, RenderEntityDto>) {}

  findById(id: string) {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  save(render: RenderEntityDto) {
    if (!(this.rows instanceof Map)) throw new Error('mutable rows required');
    this.rows.set(render.renderId, render);
    return Promise.resolve(render);
  }
}

describe('GetDownloadService', () => {
  it('returns a presigned URL for completed renders', async () => {
    const repository = new MemoryRenderRepository(new Map([['render-1', SAMPLE_RENDER]]));
    let ttl = 0;
    let key = '';

    const service = new GetDownloadService(repository, {
      async presign(objectKey, ttlSeconds) {
        ttl = ttlSeconds;
        key = objectKey;
        return `https://media.local/${objectKey}`;
      },
    });

    const result = await service.execute('render-1');

    expect(result.url).toBe('https://media.local/videos/output.mp4');
    expect(ttl).toBe(300);
    expect(key).toBe('videos/output.mp4');
  });

  it('returns not found for unknown render ids', async () => {
    const service = new GetDownloadService(
      new MemoryRenderRepository(new Map()),
      { async presign() { return ''; } },
    );

    await expect(service.execute('missing')).rejects.toMatchObject({
      code: 'RENDER_NOT_FOUND',
    });
  });

  it('returns not ready for non-completed renders', async () => {
    const service = new GetDownloadService(
      new MemoryRenderRepository(
        new Map([
          [
            'render-2',
            {
              ...SAMPLE_RENDER,
              renderId: 'render-2',
              status: 'RUNNING',
              outputKey: null,
            },
          ],
        ]),
      ),
      { async presign() { return ''; } },
    );

    await expect(service.execute('render-2')).rejects.toMatchObject({
      code: 'RENDER_NOT_READY',
    });
  });

  it('returns output missing for completed renders without output key', async () => {
    const service = new GetDownloadService(
      new MemoryRenderRepository(
        new Map([
          [
            'render-3',
            {
              ...SAMPLE_RENDER,
              renderId: 'render-3',
              status: 'SUCCEEDED',
              outputKey: null,
            },
          ],
        ]),
      ),
      { async presign() { return ''; } },
    );

    await expect(service.execute('render-3')).rejects.toMatchObject({
      code: 'OUTPUT_NOT_READY',
    });
  });
});
