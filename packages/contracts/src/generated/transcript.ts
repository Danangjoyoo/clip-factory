// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface Transcript {
  schemaVersion: '1.0.0';
  transcriptId: string;
  languageTag: string;
  text: string;
  segments: {
    text: string;
    startMs: number;
    endMs: number;
    wordStartIndex: number;
    wordEndIndex: number;
  }[];
  words: {
    text: string;
    startMs: number;
    endMs: number;
    confidenceMicros: number | null;
  }[];
  backend: 'MLX_WHISPER' | 'FAKE';
  model: string;
  modelRevision: string;
  weightsSha256: string | null;
  durationMs: number;
}
