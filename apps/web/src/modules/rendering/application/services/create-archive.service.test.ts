import { describe, expect, it } from 'vitest';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';
import { CreateArchiveError, CreateArchiveService } from './create-archive.service';
import type { ArchiveBuilderPort } from '../ports/archive-builder.port';

const SUCCESS_RENDER: RenderEntityDto = {
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
  title: 'Second Clip!!!',
  encoder: {
    strategy: 'SOFTWARE',
    videoCodec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
  },
  platformPreset: 'YOUTUBE_SHORTS',
  status: 'SUCCEEDED',
  outputKey: 'videos/second.mp4',
  srtObjectKey: 'subs/second.srt',
  errorCode: null,
};

const FAILED_RENDER: RenderEntityDto = {
  ...SUCCESS_RENDER,
  renderId: 'render-2',
  outputKey: null,
  srtObjectKey: null,
};

class FakeBuilder implements ArchiveBuilderPort {
  public calls: Array<{ projectId: string; outputKey: string; files: readonly { name: string; sourceKey: string }[] }> = [];

  async build(projectId: string, outputKey: string, files: readonly { name: string; sourceKey: string }[]) {
    this.calls.push({ projectId, outputKey, files });
    return outputKey;
  }
}

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
}

it('creates sorted archive files and reuses only rows from the project', async () => {
  const repository = new MemoryRenderRepository([SUCCESS_RENDER, FAILED_RENDER]);
  const builder = new FakeBuilder();
  const service = new CreateArchiveService(repository, builder);
  const result = await service.execute({
    projectId: 'project-1',
    archiveId: 'archive-1',
    renders: [
      {
        renderId: 'render-1',
        title: 'Second Clip!!!',
        sortOrder: 20,
        outputKey: 'videos/second.mp4',
        srtObjectKey: 'subs/second.srt',
      },
      {
        renderId: 'render-2',
        title: 'First',
        sortOrder: 10,
        outputKey: '',
        srtObjectKey: null,
      },
    ],
  });
  expect(result.archiveKey).toBe('projects/project-1/archives/archive-1.zip');
  expect(builder.calls).toHaveLength(1);
  expect(builder.calls[0]!.files.map((f) => f.name)).toEqual([
    '001-second-clip.mp4',
    '001-second-clip.srt',
  ]);
});

it('rejects with no successful renders', async () => {
  const service = new CreateArchiveService(
    new MemoryRenderRepository([FAILED_RENDER]),
    new FakeBuilder(),
  );
  await expect(
    service.execute({
      projectId: 'project-1',
      archiveId: 'archive-2',
      renders: [
        { renderId: 'render-2', title: 'Missing output', sortOrder: 1, outputKey: '' },
      ],
    }),
  ).rejects.toThrow(CreateArchiveError);
});
