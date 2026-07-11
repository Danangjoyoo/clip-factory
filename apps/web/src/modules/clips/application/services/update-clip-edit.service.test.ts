import { describe, expect, it } from 'vitest';
import { validateClipEdit } from './update-clip-edit.service';
describe('clip edit validation', () => {
  it('enforces style and safe area', () => {
    const edit: any = {
      clipId: 'c',
      renderId: 'r',
      source: { kind: 'LOCAL_FILE' },
      range: { startMs: 0, endMs: 1000 },
      captions: { version: 1, languageTag: 'en', cues: [] },
      style: {
        version: 1,
        fontFamily: 'Inter',
        fontSizePx: 32,
        textColor: '#ffffffff',
        outlineColor: '#000000ff',
        backgroundColor: '#00000000',
        activeWordColor: '#ffffffff',
        verticalPositionMicros: 800000,
        maxWordsPerLine: 6,
        activeWordEmphasis: true,
      },
      frame: { automaticTrack: [], manualFocalPoint: null },
      platformPreset: 'YOUTUBE_SHORTS',
    };
    expect(() =>
      validateClipEdit(edit, {
        YOUTUBE_SHORTS: { safeArea: { top: 0.08, bottom: 0.2 } },
      } as any),
    ).not.toThrow();
  });
});
