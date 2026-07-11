import { describe, expect, it, vi } from 'vitest';
import { SetFocalPointService } from './set-focal-point.service';

const config = {
  clipId: 'clip-1',
  automaticTrack: [{ source: 'SUBJECT_TRACK' }],
  manualFocalPoint: null,
  provenance: {
    algorithmVersion: 'reframe-v1',
    detector: 'fake',
    detectorRevision: 'test',
    confidenceFloorMicros: 500000,
    smoothingAlphaMicros: 250000,
    proxy: { width: 640, sampleRateHz: 5 },
  },
};

describe('SetFocalPointService', () => {
  it('preserves automatic history and schedules preparation', async () => {
    const store = { get: vi.fn().mockResolvedValue(config), save: vi.fn() };
    const preparation = { prepare: vi.fn() };
    const result = await new SetFocalPointService(store, preparation).execute({
      projectWorkflowId: 'wf',
      clipId: 'clip-1',
      startMs: 0,
      endMs: 1000,
      xMicros: 250000,
      yMicros: 400000,
    });
    expect(result.automaticTrack).toEqual(config.automaticTrack);
    expect(result.manualFocalPoint).toEqual({
      xMicros: 250000,
      yMicros: 400000,
    });
    expect(preparation.prepare).toHaveBeenCalledOnce();
  });
});
