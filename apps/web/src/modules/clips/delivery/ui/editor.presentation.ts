export type EditorClip = {
  id: string;
  title?: string | null;
  startMs: number;
  endMs: number;
  sourceDurationMs?: number;
  origin?: string;
  rank?: number | null;
  model?: string;
  reasoning?: string;
  score?: number | null;
  costMicrousd?: bigint;
  language?: string;
  inheritedFrame?: string;
  outputFrame?: string;
  state?: string;
  previewState?: 'READY' | 'UPDATING' | 'FAILED';
  previewPercent?: number;
  previewEtaLabel?: string;
  previewUrl?: string;
};

export const formatTimecode = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
