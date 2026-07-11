export type CaptionFontFamily = 'Inter' | 'Arial' | 'Helvetica Neue';
export interface CaptionStyleV1 {
  readonly version: 1;
  readonly fontFamily: CaptionFontFamily;
  readonly fontSizePx: number;
  readonly textColor: string;
  readonly outlineColor: string;
  readonly backgroundColor: string;
  readonly activeWordColor: string;
  readonly verticalPositionMicros: number;
  readonly maxWordsPerLine: number;
  readonly activeWordEmphasis: boolean;
}
export interface FrameConfigurationV1 {
  readonly automaticTrack: readonly {
    timeMs: number;
    centerXMicros: number;
    centerYMicros: number;
    confidenceMicros: number;
    source: 'SUBJECT_TRACK' | 'CENTER_FALLBACK' | 'MANUAL_FOCAL_POINT';
  }[];
  readonly manualFocalPoint: { xMicros: number; yMicros: number } | null;
}
