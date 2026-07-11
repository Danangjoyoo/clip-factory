import { describe, expect, it } from 'vitest';
import {
  clipEditEntityToRecord,
  clipEditRecordToEntity,
} from './clip-edit.converter';

const entity = {
  clipId: 'clip-1',
  renderId: 'render-1',
  source: { kind: 'LOCAL_FILE' } as never,
  range: { startMs: 0, endMs: 1000 },
  captions: { version: 1 as const, languageTag: 'en', cues: [] },
  style: { version: 1 } as never,
  frame: { automaticTrack: [], manualFocalPoint: null } as never,
  title: null,
  platformPreset: 'INSTAGRAM_REELS' as const,
};

describe('clip edit persistence converter', () => {
  it('round trips JSON fields and normalized enum', () => {
    const record = clipEditEntityToRecord(entity);
    expect(record.platformPreset).toBe('INSTAGRAM_REELS');
    expect(clipEditRecordToEntity(record)).toMatchObject(entity);
  });
});
