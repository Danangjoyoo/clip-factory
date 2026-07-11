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
  CANCELLED: 'CANCELLED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
