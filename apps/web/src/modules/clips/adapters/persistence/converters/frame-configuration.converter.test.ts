import { describe, expect, it } from 'vitest';
import {
  frameConfigurationEntityToRecord,
  frameConfigurationRecordToEntity,
} from './frame-configuration.converter';

describe('frame configuration conversion', () => {
  it('round trips provenance and track values', () => {
    const entity = {
      clipId: 'clip-1',
      automaticTrack: [{ timeMs: 0 }],
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
    expect(
      frameConfigurationRecordToEntity(
        frameConfigurationEntityToRecord(entity),
      ),
    ).toEqual(entity);
  });
});
