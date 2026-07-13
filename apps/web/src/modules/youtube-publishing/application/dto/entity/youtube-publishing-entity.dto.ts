import type {
  AIUsageEventId,
  ClipId,
  ProjectId,
  PublicationAttemptId,
  PublicationId,
  RenderId,
  PublishingMetadataDraftId,
  WorkflowId,
  YouTubeConnectionId,
} from '../../../../../shared/domain';
import type { PublishingMetadata } from '../../../domain/publishing-metadata';
import type { PublicationState as PublicationStateType } from '../../../domain/publication-state';
import type {
  PublicationVisibility as PublicationVisibilityType,
  PublishingSchedule,
} from '../../../domain/publishing-schedule';

export { PublicationState } from '../../../domain/publication-state';
export { PublicationVisibility } from '../../../domain/publishing-schedule';
export type {
  PublicationAttemptId,
  PublicationId,
  PublishingMetadataDraftId,
  YouTubeConnectionId,
} from '../../../../../shared/domain';

export enum YouTubeConnectionState {
  Disconnected = 'DISCONNECTED',
  Connected = 'CONNECTED',
  ReauthRequired = 'REAUTH_REQUIRED',
}

export type YouTubeConnectionEntityDto = {
  id: YouTubeConnectionId;
  channelId: string;
  channelTitle: string;
  channelHandle: string | null;
  avatarUrl: string | null;
  grantedScopes: readonly string[];
  state: YouTubeConnectionState;
  oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refreshTokenExpiresAt: Date | null;
  healthCheckedAt: Date | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  revocationUncertain: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export enum MetadataDraftState {
  Empty = 'METADATA_EMPTY',
  Draft = 'METADATA_DRAFT',
  AwaitingApproval = 'AWAITING_APPROVAL',
  Approved = 'APPROVED',
  Superseded = 'SUPERSEDED',
}

export type PublishingMetadataEntityDto = PublishingMetadata;
export type PublishingScheduleEntityDto = PublishingSchedule;

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
  visibility: PublicationVisibilityType;
  apiProjectVerifiedSnapshot: boolean;
  schedule: PublishingScheduleEntityDto | null;
  state: PublicationStateType;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  remoteVideoCreatedAt: Date | null;
  thumbnailWarningCode: string | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export enum PublicationAttemptStage {
  Starting = 'STARTING',
  Uploading = 'UPLOADING',
  OutcomeUncertain = 'OUTCOME_UNCERTAIN',
  Reconciling = 'RECONCILING',
  Polling = 'POLLING',
  Thumbnail = 'THUMBNAIL',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export type PublicationAttemptEntityDto = {
  id: PublicationAttemptId;
  publicationId: PublicationId;
  attemptNumber: number;
  idempotencyKey: string;
  resumableSessionReference: string | null;
  acknowledgedBytes: bigint;
  totalBytes: bigint;
  stage: PublicationAttemptStage;
  progressPercent: number;
  finalChunkDispatchStartedAt: Date | null;
  outcomeUncertainAt: Date | null;
  reconciliationCheckedAt: Date | null;
  reconciliationResult:
    | 'VIDEO_FOUND'
    | 'NO_MATCH_FOUND'
    | 'INCONCLUSIVE'
    | null;
  duplicateRiskAcknowledgedAt: Date | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};
