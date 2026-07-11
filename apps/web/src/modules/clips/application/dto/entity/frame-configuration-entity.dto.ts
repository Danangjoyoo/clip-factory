export interface FrameConfigurationEntityDto {
  clipId: string;
  automaticTrack: readonly Record<string, unknown>[];
  manualFocalPoint: { xMicros: number; yMicros: number } | null;
  provenance: { algorithmVersion: string; detector: string; detectorRevision: string; confidenceFloorMicros: number; smoothingAlphaMicros: number; proxy: { width: number; sampleRateHz: number } };
}
