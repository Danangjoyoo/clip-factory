export const ProjectMode = {
  AI_HIGHLIGHTS: 'AI_HIGHLIGHTS',
  MANUAL: 'MANUAL',
} as const;
export type ProjectMode = (typeof ProjectMode)[keyof typeof ProjectMode];
export const SourceKind = {
  LOCAL_FILE: 'LOCAL_FILE',
  BROWSER_UPLOAD: 'BROWSER_UPLOAD',
} as const;
export type SourceKind = (typeof SourceKind)[keyof typeof SourceKind];
export const PlatformPreset = {
  YOUTUBE_SHORTS: 'YOUTUBE_SHORTS',
  INSTAGRAM_REELS: 'INSTAGRAM_REELS',
  TIKTOK: 'TIKTOK',
} as const;
export type PlatformPreset =
  (typeof PlatformPreset)[keyof typeof PlatformPreset];
export const SourceHealth = {
  UNKNOWN: 'UNKNOWN',
  LOCATED: 'LOCATED',
  HEALTHY: 'HEALTHY',
  MISSING: 'MISSING',
  CHANGED: 'CHANGED',
  NOT_ALLOWED: 'NOT_ALLOWED',
  INVALID: 'INVALID',
} as const;
export type SourceHealth = (typeof SourceHealth)[keyof typeof SourceHealth];
export const ProjectStatus = {
  DRAFT: 'DRAFT',
  VALIDATING_SOURCE: 'VALIDATING_SOURCE',
  UPLOADING: 'UPLOADING',
  QUEUED: 'QUEUED',
  PREPROCESSING: 'PREPROCESSING',
  TRANSCRIBING: 'TRANSCRIBING',
  VERIFYING_BUDGET: 'VERIFYING_BUDGET',
  AWAITING_BUDGET: 'AWAITING_BUDGET',
  ANALYZING: 'ANALYZING',
  PAID_CALL_UNCERTAIN: 'PAID_CALL_UNCERTAIN',
  GENERATING_PREVIEWS: 'GENERATING_PREVIEWS',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  RENDERING: 'RENDERING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  SOURCE_MISSING: 'SOURCE_MISSING',
  SOURCE_CHANGED: 'SOURCE_CHANGED',
  SOURCE_NOT_ALLOWED: 'SOURCE_NOT_ALLOWED',
  RELINKING_SOURCE: 'RELINKING_SOURCE',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
