import {
  type ClipId,
  type ProjectId,
  type PublicationId,
  type RenderId,
  type PublishingMetadataDraftId,
  type WorkflowId,
  type YouTubeConnectionId,
} from '../../../../shared/domain';
import {
  PublicationState,
  PublicationVisibility,
  type PublicationEntityDto,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import { parsePublishingMetadata } from '../../domain/publishing-metadata';
import type {
  PublicationRecordDto,
  PublicationRecordState,
  PublicationRecordVisibility,
} from '../../adapters/persistence/dto/record/publication-record.dto';

const states: Readonly<Record<PublicationRecordState, PublicationState>> = {
  READY_TO_UPLOAD: PublicationState.ReadyToUpload,
  UPLOADING: PublicationState.Uploading,
  UPLOAD_OUTCOME_UNCERTAIN: PublicationState.UploadOutcomeUncertain,
  YOUTUBE_PROCESSING: PublicationState.YouTubeProcessing,
  PRIVATE_REVIEW: PublicationState.PrivateReview,
  SCHEDULED: PublicationState.Scheduled,
  PUBLISHED: PublicationState.Published,
  FAILED: PublicationState.Failed,
  CANCELLED: PublicationState.Cancelled,
};

const recordStates: Readonly<Record<PublicationState, PublicationRecordState>> =
  {
    [PublicationState.ReadyToUpload]: 'READY_TO_UPLOAD',
    [PublicationState.Uploading]: 'UPLOADING',
    [PublicationState.UploadOutcomeUncertain]: 'UPLOAD_OUTCOME_UNCERTAIN',
    [PublicationState.YouTubeProcessing]: 'YOUTUBE_PROCESSING',
    [PublicationState.PrivateReview]: 'PRIVATE_REVIEW',
    [PublicationState.Scheduled]: 'SCHEDULED',
    [PublicationState.Published]: 'PUBLISHED',
    [PublicationState.Failed]: 'FAILED',
    [PublicationState.Cancelled]: 'CANCELLED',
  };

const visibilities: Readonly<
  Record<PublicationRecordVisibility, PublicationVisibility>
> = {
  PRIVATE_REVIEW: PublicationVisibility.PrivateReview,
  SCHEDULED: PublicationVisibility.Scheduled,
};

const recordVisibilities: Readonly<
  Record<PublicationVisibility, PublicationRecordVisibility>
> = {
  [PublicationVisibility.PrivateReview]: 'PRIVATE_REVIEW',
  [PublicationVisibility.Scheduled]: 'SCHEDULED',
};

const uuid = (value: string, name: string): string => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new Error(`${name} must be a UUID`);
  }
  return value;
};

export function publicationRecordToEntity(
  record: PublicationRecordDto,
): PublicationEntityDto {
  const state = states[record.state];
  if (!state)
    throw new Error(`unknown publication record state ${record.state}`);
  const visibility = visibilities[record.visibility];
  if (!visibility)
    throw new Error(`unknown publication visibility ${record.visibility}`);
  const hasSchedule = Boolean(
    record.source_local_datetime ||
    record.source_timezone ||
    record.schedule_at_utc,
  );
  if (visibility === PublicationVisibility.Scheduled && !hasSchedule) {
    throw new Error(
      'persisted scheduled publication has an incomplete schedule',
    );
  }
  if (
    hasSchedule &&
    (!record.source_local_datetime ||
      !record.source_timezone ||
      !record.schedule_at_utc)
  ) {
    throw new Error(
      'persisted scheduled publication has an incomplete schedule',
    );
  }
  return Object.freeze({
    id: uuid(record.id, 'id') as PublicationId,
    projectId: uuid(record.project_id, 'projectId') as ProjectId,
    clipId: uuid(record.clip_id, 'clipId') as ClipId,
    renderId: uuid(record.render_id, 'renderId') as RenderId,
    connectionId: uuid(
      record.connection_id,
      'connectionId',
    ) as YouTubeConnectionId,
    metadataDraftId: uuid(
      record.metadata_draft_id,
      'metadataDraftId',
    ) as PublishingMetadataDraftId,
    workflowId: record.workflow_id as WorkflowId,
    intentKey: record.intent_key,
    idempotencyKey: record.idempotency_key,
    metadataSnapshot: parsePublishingMetadata(
      record.metadata_snapshot as Parameters<typeof parsePublishingMetadata>[0],
    ),
    visibility,
    apiProjectVerifiedSnapshot: record.api_project_verified_snapshot,
    schedule: hasSchedule
      ? {
          sourceLocalDateTime: record.source_local_datetime as string,
          sourceTimezone: record.source_timezone as string,
          publishAtUtc: (record.schedule_at_utc as Date).toISOString(),
        }
      : null,
    state,
    youtubeVideoId: record.youtube_video_id,
    youtubeUrl: record.youtube_url,
    remoteVideoCreatedAt: record.remote_video_created_at,
    thumbnailWarningCode: record.thumbnail_warning_code,
    sanitizedErrorCode: record.sanitized_error_code,
    sanitizedErrorMessage: record.sanitized_error_message,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  });
}

export function publicationEntityToRecord(
  entity: Omit<PublicationEntityDto, 'createdAt' | 'updatedAt'>,
): Omit<PublicationRecordDto, 'created_at' | 'updated_at'> {
  return {
    id: entity.id,
    project_id: entity.projectId,
    clip_id: entity.clipId,
    render_id: entity.renderId,
    connection_id: entity.connectionId,
    metadata_draft_id: entity.metadataDraftId,
    workflow_id: entity.workflowId,
    intent_key: entity.intentKey,
    idempotency_key: entity.idempotencyKey,
    metadata_snapshot: entity.metadataSnapshot,
    visibility: recordVisibilities[entity.visibility],
    api_project_verified_snapshot: entity.apiProjectVerifiedSnapshot,
    source_local_datetime: entity.schedule?.sourceLocalDateTime ?? null,
    source_timezone: entity.schedule?.sourceTimezone ?? null,
    schedule_at_utc: entity.schedule
      ? new Date(entity.schedule.publishAtUtc)
      : null,
    state: recordStates[entity.state],
    youtube_video_id: entity.youtubeVideoId,
    youtube_url: entity.youtubeUrl,
    remote_video_created_at: entity.remoteVideoCreatedAt,
    thumbnail_warning_code: entity.thumbnailWarningCode,
    sanitized_error_code: entity.sanitizedErrorCode,
    sanitized_error_message: entity.sanitizedErrorMessage,
  };
}
