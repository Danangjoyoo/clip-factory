// Generated from Clip Factory contract 1.0.0. Do not edit.

export type ClipFactoryYouTubePublishingContracts =
  | OAuthConnectionWorkflowInputV1
  | OAuthConnectionWorkflowResultV1
  | YouTubeConnectionEventV1
  | MetadataGenerationWorkflowInputV1
  | PublicationWorkflowInputV1
  | PublicationProgressEventV1;
export type Uuid = string;
/**
 * @minItems 2
 * @maxItems 2
 */
export type RequiredScopes = readonly [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];
export type YouTubeConnectionEventV1 =
  | {
      contractVersion: 1;
      type: 'CONNECTED';
      connectionId: Uuid;
      channelId: string;
      channelTitle: string;
      channelHandle: string | null;
      avatarUrl: string | null;
      grantedScopes: RequiredScopes;
      oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
      refreshTokenExpiresAt: string | null;
    }
  | {
      contractVersion: 1;
      type: 'REAUTH_REQUIRED';
      connectionId: Uuid;
      reasonCode: 'INVALID_GRANT';
    }
  | {
      contractVersion: 1;
      type: 'DISCONNECTED';
      connectionId: Uuid;
      revocationUncertain: boolean;
    }
  | {
      contractVersion: 1;
      type: 'FAILED';
      connectionId: Uuid;
      reasonCode:
        | 'CONSENT_DENIED'
        | 'STATE_MISMATCH'
        | 'STATE_EXPIRED'
        | 'MISSING_SCOPE'
        | 'CALLBACK_TIMEOUT'
        | 'GOOGLE_POLICY_DENIED';
    };
export type MoneyMicrousd = string;
export type PublicationWorkflowInputV1 = {
  [k: string]: unknown;
} & {
  contractVersion: 1;
  publicationId: Uuid;
  attemptId: Uuid;
  connectionId: Uuid;
  clipId: Uuid;
  renderId: Uuid;
  renderObject: ObjectReference;
  coverObject: ObjectReference | null;
  totalBytes: number;
  metadataSnapshot: MetadataSnapshotV1;
  visibility: 'PRIVATE_REVIEW' | 'SCHEDULED';
  scheduleAtUtc: string | null;
  sourceTimezone: string | null;
  apiProjectVerified: boolean;
};
export type PublicationProgressEventV1 =
  | PublicationUploadProgressEventV1
  | PublicationUploadOutcomeUncertainEventV1
  | PublicationVideoCreatedEventV1;
export type NonnegativeIntegerString = string;

export interface OAuthConnectionWorkflowInputV1 {
  contractVersion: 1;
  connectionId: Uuid;
  requestedScopes: RequiredScopes;
}
export interface OAuthConnectionWorkflowResultV1 {
  contractVersion: 1;
  connectionId: Uuid;
  status: 'CONNECTED' | 'DISCONNECTED' | 'REAUTH_REQUIRED';
  safeReasonCode:
    | 'CONSENT_DENIED'
    | 'STATE_MISMATCH'
    | 'STATE_EXPIRED'
    | 'MISSING_SCOPE'
    | 'CALLBACK_TIMEOUT'
    | 'GOOGLE_POLICY_DENIED'
    | 'INVALID_GRANT'
    | null;
}
export interface MetadataGenerationWorkflowInputV1 {
  contractVersion: 1;
  projectId: Uuid;
  clipId: Uuid;
  draftId: Uuid;
  callId: Uuid;
  requestHash: string;
  transcriptObject: ObjectReference;
  modelId: 'gpt-5.6-sol' | 'gpt-5.5';
  reasoningLevel: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  modelCatalogVersion: string;
  pricingVersion: string;
  maxGeneratedTokens: number;
  promptCachePolicy: 'EXPLICIT_DISABLED' | 'LEGACY_AUTOMATIC_NO_WRITE_FEE';
  maxCostMicrousd: MoneyMicrousd;
  instruction: string | null;
}
export interface ObjectReference {
  bucket: 'clip-factory';
  key: string;
  versionId: string | null;
  sha256: string;
}
export interface MetadataSnapshotV1 {
  title: string;
  description: string;
  /**
   * @maxItems 59
   */
  hashtags: string[];
  keywordTags: string[];
  categoryId: string;
  defaultLanguage: string;
  madeForKids: boolean;
  containsSyntheticMedia: boolean;
}
export interface PublicationUploadProgressEventV1 {
  contractVersion: 1;
  type: 'UPLOAD_PROGRESS';
  publicationId: Uuid;
  attemptId: Uuid;
  acknowledgedBytes: NonnegativeIntegerString;
  progressPercent: number;
}
export interface PublicationUploadOutcomeUncertainEventV1 {
  contractVersion: 1;
  type: 'UPLOAD_OUTCOME_UNCERTAIN';
  publicationId: Uuid;
  attemptId: Uuid;
  finalChunkDispatchedAt: string;
  safeReasonCode:
    | 'FINAL_UPLOAD_RESULT_UNKNOWN'
    | 'SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH';
  requiredAction: 'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK';
}
export interface PublicationVideoCreatedEventV1 {
  contractVersion: 1;
  type: 'VIDEO_CREATED';
  publicationId: Uuid;
  attemptId: Uuid;
  videoId: string;
  videoUrl: string;
  createdAt: string;
}
