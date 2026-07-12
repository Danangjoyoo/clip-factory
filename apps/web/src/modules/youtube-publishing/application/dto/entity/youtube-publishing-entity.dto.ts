import type {
  AIUsageEventId,
  ClipId,
  ProjectId,
  RenderId,
  WorkflowId,
} from '../../../../../shared/domain';

export type YouTubeConnectionId = string & {
  readonly __brand: 'YouTubeConnectionId';
};
export type PublishingMetadataDraftId = string & {
  readonly __brand: 'PublishingMetadataDraftId';
};
export type PublicationId = string & { readonly __brand: 'PublicationId' };
export type PublicationAttemptId = string & {
  readonly __brand: 'PublicationAttemptId';
};

export enum YouTubeConnectionState {
  Disconnected = 'DISCONNECTED',
  Connected = 'CONNECTED',
  ReauthRequired = 'REAUTH_REQUIRED',
}

export enum MetadataDraftState {
  Empty = 'METADATA_EMPTY',
  Draft = 'METADATA_DRAFT',
  AwaitingApproval = 'AWAITING_APPROVAL',
  Approved = 'APPROVED',
  Superseded = 'SUPERSEDED',
}

export enum PublicationState {
  ReadyToUpload = 'READY_TO_UPLOAD',
  Uploading = 'UPLOADING',
  UploadOutcomeUncertain = 'UPLOAD_OUTCOME_UNCERTAIN',
  YouTubeProcessing = 'YOUTUBE_PROCESSING',
  PrivateReview = 'PRIVATE_REVIEW',
  Scheduled = 'SCHEDULED',
  Published = 'PUBLISHED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export enum PublicationVisibility {
  PrivateReview = 'PRIVATE_REVIEW',
  Scheduled = 'SCHEDULED',
}

export type PublishingMetadataEntityDto = {
  title: string;
  description: string;
  hashtags: readonly string[];
  keywordTags: readonly string[];
  categoryId: string;
  defaultLanguage: string;
  madeForKids: boolean;
  containsSyntheticMedia: boolean;
};

export type PublishingScheduleEntityDto = {
  sourceLocalDateTime: string;
  sourceTimezone: string;
  publishAtUtc: string;
};

export type PublishingMetadataDraftEntityDto = {
  id: PublishingMetadataDraftId;
  projectId: ProjectId;
  clipId: ClipId;
  version: number;
  revision: number;
  state: MetadataDraftState;
  source: 'MANUAL' | 'OPENAI';
  metadata: PublishingMetadataEntityDto;
  publishingInstruction: string | null;
  modelId: string | null;
  reasoningLevel: string | null;
  maxCostMicrousd: bigint;
  estimatedCostMicrousd: bigint;
  actualCostMicrousd: bigint;
  aiUsageEventId: AIUsageEventId | null;
  approvedAt: Date | null;
  supersededAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationEntityDto = {
  id: PublicationId;
  projectId: ProjectId;
  clipId: ClipId;
  renderId: RenderId;
  connectionId: YouTubeConnectionId;
  metadataDraftId: PublishingMetadataDraftId;
  workflowId: WorkflowId;
  intentKey: string;
  idempotencyKey: string;
  metadataSnapshot: PublishingMetadataEntityDto;
  visibility: PublicationVisibility;
  apiProjectVerifiedSnapshot: boolean;
  schedule: PublishingScheduleEntityDto | null;
  state: PublicationState;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  remoteVideoCreatedAt: Date | null;
  thumbnailWarningCode: string | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};
