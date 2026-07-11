import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { RenderEntityDto } from '../../../apps/web/src/modules/rendering/application/dto/entity';
import { PrismaRenderRepository } from '../../../apps/web/src/modules/rendering/adapters/persistence/repositories/prisma-render.repository';

const loadDownloadRoute = async () =>
  import(pathToFileURL(path.resolve(process.cwd(), 'apps/web/src/app/api/renders/[renderId]/download/route.ts')).href);
const loadArchiveRoute = async () =>
  import(pathToFileURL(path.resolve(process.cwd(), 'apps/web/src/app/api/projects/[projectId]/downloads/archive/route.ts')).href);
const repository = new PrismaRenderRepository();
const sourceRender: RenderEntityDto = {
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
  title: 'Clip',
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
  errorCode: null,
};

describe.skipIf(!process.env.DATABASE_URL)('Rendering downloads integration', () => {
  it('returns 404 for unknown render download', async () => {
    const route = await loadDownloadRoute();
    const response = await route.GET(new Request('http://test/renders/missing/download'), {
      params: Promise.resolve({ renderId: 'missing' }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'RENDER_NOT_FOUND' });
  });

  it('rejects malformed archive request payloads', async () => {
    const route = await loadArchiveRoute();
    const response = await route.POST(new Request('http://test/projects/project-1/downloads/archive', {
      method: 'POST',
      body: JSON.stringify({ archiveId: '', renders: [] }),
    }), { params: Promise.resolve({ projectId: 'project-1' }) });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: 'INVALID_ARCHIVE_REQUEST' });
  });

  it('creates archive with valid request', async () => {
    await repository.save(sourceRender);
    const route = await loadArchiveRoute();
    const response = await route.POST(new Request('http://test/projects/project-1/downloads/archive', {
      method: 'POST',
      body: JSON.stringify({
        archiveId: 'archive-1',
        renders: [
          {
            renderId: 'render-1',
            title: 'Clip',
            sortOrder: 1,
            outputKey: 'videos/output.mp4',
          },
        ],
      }),
    }), { params: Promise.resolve({ projectId: 'project-1' }) });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ archiveKey: 'projects/project-1/archives/archive-1.zip' });
  });
});
