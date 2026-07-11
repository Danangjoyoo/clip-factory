// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface MediaProbe {
  schemaVersion: '1.0.0';
  durationMs: number;
  sizeBytes: number;
  container: 'mp4' | 'mov' | 'matroska' | 'webm';
  video: {
    codec: string;
    width: number;
    height: number;
    frameRateNumerator: number;
    frameRateDenominator: number;
  };
  audio: {
    codec: string;
    sampleRateHz: number;
    channels: number;
  };
  formatTags: {
    [k: string]: string;
  };
}
