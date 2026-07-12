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
