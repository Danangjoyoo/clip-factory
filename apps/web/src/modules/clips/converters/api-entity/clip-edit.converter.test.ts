import { describe, expect, it } from 'vitest';
import {
  clipEditApiToEntity,
  clipEditEntityToApi,
} from './clip-edit.converter';

const value = {
  renderId: 'render-1',
  source: { kind: 'LOCAL_FILE' },
  range: { startMs: 0, endMs: 1000 },
  captions: { version: 1 as const, languageTag: 'en', cues: [] },
  style: { version: 1 },
  frame: { automaticTrack: [], manualFocalPoint: null },
  title: null,
  platformPreset: 'TIKTOK' as const,
  encoder: null,
};

describe('clip edit API converter', () => {
  it('maps API values and applies the default encoder', () => {
    const entity = clipEditApiToEntity('clip-1', value);
    expect(entity.clipId).toBe('clip-1');
    expect(entity.encoder).toEqual({
      strategy: 'SOFTWARE',
      videoCodec: 'h264',
      audioCodec: 'aac',
      pixelFormat: 'yuv420p',
    });
    expect(clipEditEntityToApi(entity).platformPreset).toBe('TIKTOK');
  });
});
