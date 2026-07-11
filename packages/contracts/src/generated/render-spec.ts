// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface RenderSpec {
  schemaVersion: '1.0.0';
  renderId: string;
  clipId: string;
  source:
    | {
        kind: 'LOCAL_FILE';
        sourceAssetId: string;
        fingerprint: string;
        sizeBytes: number;
        modifiedAt: string;
      }
    | {
        kind: 'BROWSER_UPLOAD';
        sourceAssetId: string;
        object: {
          bucket: 'clip-factory';
          key: string;
          versionId: string | null;
          sha256: string;
        };
      };
  canvas: {
    width: 1080;
    height: 1920;
  };
  range: {
    startMs: number;
    endMs: number;
  };
  cropTrack: {
    timeMs: number;
    centerXMicros: number;
    centerYMicros: number;
    confidenceMicros: number;
    source: 'SUBJECT_TRACK' | 'CENTER_FALLBACK' | 'MANUAL_FOCAL_POINT';
  }[];
  captions: {
    id: string;
    startMs: number;
    endMs: number;
    words: {
      text: string;
      startMs: number;
      endMs: number;
    }[];
  }[];
  style: {
    fontFamily: 'Inter' | 'Arial' | 'Helvetica Neue';
    fontSizePx: number;
    textColor: string;
    outlineColor: string;
    backgroundColor: string;
    activeWordColor: string;
    verticalPositionMicros: number;
    maxWordsPerLine: number;
    activeWordEmphasis: boolean;
  };
  title: string | null;
  encoder: {
    strategy: 'VIDEOTOOLBOX' | 'SOFTWARE';
    videoCodec: 'h264';
    audioCodec: 'aac';
    pixelFormat: 'yuv420p';
  };
  platformPreset: 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'TIKTOK';
}
