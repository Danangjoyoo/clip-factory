import { describe, expect, it } from 'vitest';

import type { RenderEntityDto } from '../dto/entity';
import type { RenderRepository } from '../ports/render.repository';
import {
  QueueRenderBatchError,
  QueueRenderBatchService,
  type RenderBatchPort,
  type QueueRenderBatchRequest,
} from './queue-render-batch.service';

const QUEUED: RenderEntityDto = {
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
  retryOfRenderId: null,
  outputKey: null,
  srtObjectKey: null,
  errorCode: null,
};

class MemoryRenderRepository implements RenderRepository {
  private readonly rows = new Map<string, RenderEntityDto>();

  constructor() { this.rows.set(QUEUED.renderId, QUEUED); }
  findById(id: string) { return Promise.resolve(this.rows.get(id) ?? null); }
  async save(render: RenderEntityDto) {
    this.rows.set(render.renderId, render);
    return render;
  }
}

it('queues existing clips as one batch', async () => {
  const queueCalls: QueueRenderBatchRequest[] = [];
  const queue: RenderBatchPort = {
    async queue(workflowId, batchId, renderIds) {
      queueCalls.push({ workflowId, batchId, renderIds });
    },
  };
  const service = new QueueRenderBatchService(new MemoryRenderRepository(), queue);
  const result = await service.execute({
    workflowId: 'wf',
    batchId: 'batch-1',
    renderIds: [QUEUED.renderId],
  });
  expect(result.queuedCount).toBe(1);
  expect(queueCalls).toHaveLength(1);
  expect(queueCalls[0]!.renderIds).toEqual([QUEUED.renderId]);
});

it('rejects empty batch', async () => {
  const service = new QueueRenderBatchService(
    new MemoryRenderRepository(),
    { async queue() {} },
  );
  await expect(
    service.execute({ workflowId: 'wf', batchId: 'batch-1', renderIds: [] }),
  ).rejects.toThrow(new QueueRenderBatchError('EMPTY_BATCH'));
});
