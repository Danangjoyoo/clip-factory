import {
  type PublicationAttemptId,
  type PublicationId,
} from '../../../../shared/domain';
import {
  PublicationAttemptStage,
  type PublicationAttemptEntityDto,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import type {
  PublicationAttemptRecordDto,
  PublicationAttemptRecordStage,
} from '../../adapters/persistence/dto/record/publication-attempt-record.dto';

const stages: Readonly<
  Record<PublicationAttemptRecordStage, PublicationAttemptStage>
> = {
  STARTING: PublicationAttemptStage.Starting,
  UPLOADING: PublicationAttemptStage.Uploading,
  OUTCOME_UNCERTAIN: PublicationAttemptStage.OutcomeUncertain,
  RECONCILING: PublicationAttemptStage.Reconciling,
  POLLING: PublicationAttemptStage.Polling,
  THUMBNAIL: PublicationAttemptStage.Thumbnail,
  COMPLETED: PublicationAttemptStage.Completed,
  FAILED: PublicationAttemptStage.Failed,
  CANCELLED: PublicationAttemptStage.Cancelled,
};

const recordStages: Readonly<
  Record<PublicationAttemptStage, PublicationAttemptRecordStage>
> = {
  [PublicationAttemptStage.Starting]: 'STARTING',
  [PublicationAttemptStage.Uploading]: 'UPLOADING',
  [PublicationAttemptStage.OutcomeUncertain]: 'OUTCOME_UNCERTAIN',
  [PublicationAttemptStage.Reconciling]: 'RECONCILING',
  [PublicationAttemptStage.Polling]: 'POLLING',
  [PublicationAttemptStage.Thumbnail]: 'THUMBNAIL',
  [PublicationAttemptStage.Completed]: 'COMPLETED',
  [PublicationAttemptStage.Failed]: 'FAILED',
  [PublicationAttemptStage.Cancelled]: 'CANCELLED',
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

export function publicationAttemptRecordToEntity(
  record: PublicationAttemptRecordDto,
): PublicationAttemptEntityDto {
  const stage = stages[record.stage];
  if (!stage)
    throw new Error(`unknown publication attempt stage ${record.stage}`);
  return Object.freeze({
    id: uuid(record.id, 'id') as PublicationAttemptId,
    publicationId: uuid(
      record.publication_id,
      'publicationId',
    ) as PublicationId,
    attemptNumber: record.attempt_number,
    idempotencyKey: record.idempotency_key,
    resumableSessionReference: record.resumable_session_reference,
    acknowledgedBytes: record.acknowledged_bytes,
    totalBytes: record.total_bytes,
    stage,
    progressPercent: record.progress_percent,
    finalChunkDispatchStartedAt: record.final_chunk_dispatch_started_at,
    outcomeUncertainAt: record.outcome_uncertain_at,
    reconciliationCheckedAt: record.reconciliation_checked_at,
    reconciliationResult: record.reconciliation_result,
    duplicateRiskAcknowledgedAt: record.duplicate_risk_acknowledged_at,
    sanitizedErrorCode: record.sanitized_error_code,
    sanitizedErrorMessage: record.sanitized_error_message,
    startedAt: record.started_at,
    completedAt: record.completed_at,
    updatedAt: record.updated_at,
  });
}

export function publicationAttemptEntityToRecord(
  entity: PublicationAttemptEntityDto,
): PublicationAttemptRecordDto {
  return {
    id: entity.id,
    publication_id: entity.publicationId,
    attempt_number: entity.attemptNumber,
    idempotency_key: entity.idempotencyKey,
    resumable_session_reference: entity.resumableSessionReference,
    acknowledged_bytes: entity.acknowledgedBytes,
    total_bytes: entity.totalBytes,
    stage: recordStages[entity.stage],
    progress_percent: entity.progressPercent,
    final_chunk_dispatch_started_at: entity.finalChunkDispatchStartedAt,
    outcome_uncertain_at: entity.outcomeUncertainAt,
    reconciliation_checked_at: entity.reconciliationCheckedAt,
    reconciliation_result: entity.reconciliationResult,
    duplicate_risk_acknowledged_at: entity.duplicateRiskAcknowledgedAt,
    sanitized_error_code: entity.sanitizedErrorCode,
    sanitized_error_message: entity.sanitizedErrorMessage,
    started_at: entity.startedAt,
    completed_at: entity.completedAt,
    updated_at: entity.updatedAt,
  };
}
