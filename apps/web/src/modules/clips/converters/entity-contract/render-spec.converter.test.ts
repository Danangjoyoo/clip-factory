import { describe, expect, it } from 'vitest';
import { renderSpecEntityToContract } from './render-spec.converter';
describe('render spec converter', () => {
  it('normalizes version and caption words', () => {
    const out = renderSpecEntityToContract({
      version: '1.0.0',
      renderId: '00000000-0000-4000-8000-000000000001',
      clipId: '00000000-0000-4000-8000-000000000002',
      source: {
        kind: 'LOCAL_FILE',
        sourceAssetId: '00000000-0000-4000-8000-000000000003',
        fingerprint: 'a'.repeat(64),
        sizeBytes: 1,
        modifiedAt: new Date().toISOString(),
      },
      canvas: { width: 1080, height: 1920 },
      range: { startMs: 0, endMs: 1 },
      cropTrack: [],
      captions: [
        {
          id: '00000000-0000-4000-8000-000000000004',
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

  it('rejects private source paths before emitting a contract', () => {
    expect(() =>
      renderSpecEntityToContract({
        version: '1.0.0',
        renderId: '00000000-0000-4000-8000-000000000001',
        clipId: '00000000-0000-4000-8000-000000000002',
        source: {
          kind: 'LOCAL_FILE',
          sourceAssetId: '00000000-0000-4000-8000-000000000003',
          fingerprint: 'a'.repeat(64),
          sizeBytes: 1,
          modifiedAt: new Date().toISOString(),
          resolvedPath: '/Users/me/video.mp4',
        } as never,
        canvas: { width: 1080, height: 1920 },
        range: { startMs: 0, endMs: 1 },
        cropTrack: [],
        captions: [],
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
      }),
    ).toThrow('PRIVATE_SOURCE_VALUE');
  });

  it('rejects nested and absolute source paths', () => {
    const source = {
      kind: 'BROWSER_UPLOAD',
      sourceAssetId: '00000000-0000-4000-8000-000000000003',
      object: {
        bucket: 'clip-factory',
        key: '/Users/me/video.mp4',
        versionId: null,
        sha256: 'a'.repeat(64),
      },
    };
    expect(() =>
      renderSpecEntityToContract({
        version: '1.0.0',
        renderId: '00000000-0000-4000-8000-000000000001',
        clipId: '00000000-0000-4000-8000-000000000002',
        source: source as never,
        canvas: { width: 1080, height: 1920 },
        range: { startMs: 0, endMs: 1 },
        cropTrack: [],
        captions: [],
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
      }),
    ).toThrow('PRIVATE_SOURCE_VALUE');
  });

  it('rejects malformed ranges before reading range properties', () => {
    expect(() =>
      renderSpecEntityToContract({
        version: '1.0.0',
        renderId: '00000000-0000-4000-8000-000000000001',
        clipId: '00000000-0000-4000-8000-000000000002',
        source: {
          kind: 'LOCAL_FILE',
          sourceAssetId: '00000000-0000-4000-8000-000000000003',
          fingerprint: 'a'.repeat(64),
          sizeBytes: 1,
          modifiedAt: new Date().toISOString(),
        },
        canvas: { width: 1080, height: 1920 },
        range: null as never,
        cropTrack: [],
        captions: [],
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
      }),
    ).toThrow('INVALID_RANGE');
  });
});
