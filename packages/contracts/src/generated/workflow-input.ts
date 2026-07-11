// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface WorkflowInput {
  schemaVersion: '1.0.0';
  workflowId: string;
  projectId: string;
  sourceAssetId: string;
  mode: 'AI_HIGHLIGHTS' | 'MANUAL';
  languageTag: string;
  maxClipSeconds: number;
  platformPreset: 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'TIKTOK';
  analysis: {
    [k: string]: unknown;
  } | null;
  requestedAt: string;
}
