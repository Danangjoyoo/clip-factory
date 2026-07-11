import { describe, expect, it } from 'vitest';
import { renderSpecEntityToContract } from './render-spec.converter';
describe('render spec converter', () => {
  it('normalizes version and caption words', () => {
    const out = renderSpecEntityToContract({
      version: '1.0.0',
      renderId: 'r',
      clipId: 'c',
      source: {
        kind: 'LOCAL_FILE',
        sourceAssetId: 's',
        fingerprint: 'a'.repeat(64),
        sizeBytes: 1,
        modifiedAt: new Date().toISOString(),
      },
      canvas: { width: 1080, height: 1920 },
      range: { startMs: 0, endMs: 1 },
      cropTrack: [],
      captions: [
        {
          id: 'c',
          startMs: 0,
          endMs: 1,
          words: [{ id: 'w', text: 'x', startMs: 0, endMs: 1 }],
        },
      ],
      captionDocument: { version: 1, languageTag: 'en', cues: [] },
      style: {
        version: 1,
        fontFamily: 'Inter',
        fontSizePx: 24,
        textColor: '#ffffffff',
        outlineColor: '#000000ff',
        backgroundColor: '#00000000',
        activeWordColor: '#ffffffff',
        verticalPositionMicros: 500000,
        maxWordsPerLine: 1,
        activeWordEmphasis: true,
      },
      title: null,
      encoder: {
        strategy: 'SOFTWARE',
        videoCodec: 'h264',
        audioCodec: 'aac',
        pixelFormat: 'yuv420p',
      },
      platformPreset: 'TIKTOK',
    });
    expect(out.schemaVersion).toBe('1.0.0');
  });
});
