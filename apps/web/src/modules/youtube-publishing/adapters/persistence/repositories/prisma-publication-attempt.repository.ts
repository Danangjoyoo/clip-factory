import { Prisma, PrismaClient } from '../../../../../generated/prisma/client';
import type {
  PublicationAttemptId,
  PublicationId,
} from '../../../../../shared/domain';
import { PublicationAttemptStage } from '../../../application/dto/entity/youtube-publishing-entity.dto';
import type {
  FinishAttemptEntityDto,
  InsertPublicationAttemptEntityDto,
  PublicationAttemptRepositoryPort,
  SaveAttemptProgressEntityDto,
} from '../../../application/ports/publication-attempt.repository';
import {
  publicationAttemptEntityToRecord,
  publicationAttemptRecordToEntity,
} from '../../../converters/entity-record/publication-attempt.converter';
import type { PublicationAttemptRecordDto } from '../dto/record/publication-attempt-record.dto';

type Row = Awaited<ReturnType<PrismaClient['publicationAttempt']['findFirst']>>;

const select = {
  id: true,
  publicationId: true,
  attemptNumber: true,
  idempotencyKey: true,
  resumableSessionReference: true,
  acknowledgedBytes: true,
  totalBytes: true,
  stage: true,
  progressPercent: true,
  finalChunkDispatchStartedAt: true,
  outcomeUncertainAt: true,
  reconciliationCheckedAt: true,
  reconciliationResult: true,
  duplicateRiskAcknowledgedAt: true,
  sanitizedErrorCode: true,
  sanitizedErrorMessage: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
} satisfies Prisma.PublicationAttemptSelect;

const record = (row: NonNullable<Row>): PublicationAttemptRecordDto => ({
  id: row.id,
  publication_id: row.publicationId,
  attempt_number: row.attemptNumber,
  idempotency_key: row.idempotencyKey,
  resumable_session_reference: row.resumableSessionReference,
  acknowledged_bytes: row.acknowledgedBytes,
  total_bytes: row.totalBytes,
  stage: row.stage as PublicationAttemptRecordDto['stage'],
  progress_percent: row.progressPercent,
  final_chunk_dispatch_started_at: row.finalChunkDispatchStartedAt,
  outcome_uncertain_at: row.outcomeUncertainAt,
  reconciliation_checked_at: row.reconciliationCheckedAt,
  reconciliation_result:
    row.reconciliationResult as PublicationAttemptRecordDto['reconciliation_result'],
  duplicate_risk_acknowledged_at: row.duplicateRiskAcknowledgedAt,
  sanitized_error_code: row.sanitizedErrorCode,
  sanitized_error_message: row.sanitizedErrorMessage,
  started_at: row.startedAt,
  completed_at: row.completedAt,
  updated_at: row.updatedAt,
});

export class PrismaPublicationAttemptRepository implements PublicationAttemptRepositoryPort {
  constructor(private readonly database: PrismaClient) {}

  async findById(id: PublicationAttemptId) {
    const row = await this.database.publicationAttempt.findUnique({
      where: { id },
      select,
    });
    return row ? publicationAttemptRecordToEntity(record(row)) : null;
  }

  async requireCurrentForUpdate(publicationId: PublicationId) {
    const rows = await this.database.$queryRaw<PublicationAttemptRecordDto[]>`
      select id, publication_id, attempt_number, idempotency_key,
             resumable_session_reference, acknowledged_bytes, total_bytes, stage,
             progress_percent, final_chunk_dispatch_started_at, outcome_uncertain_at,
             reconciliation_checked_at, reconciliation_result,
             duplicate_risk_acknowledged_at, sanitized_error_code,
             sanitized_error_message, started_at, completed_at, updated_at
      from publication_attempts
      where publication_id = ${publicationId}
      order by attempt_number desc
      limit 1
      for update
    `;
    if (!rows[0])
      throw new Error(`publication attempt not found: ${publicationId}`);
    return publicationAttemptRecordToEntity(rows[0]);
  }

  async listByPublication(publicationId: PublicationId) {
    const rows = await this.database.publicationAttempt.findMany({
      where: { publicationId },
      orderBy: { attemptNumber: 'asc' },
      select,
    });
    return rows.map((row) => publicationAttemptRecordToEntity(record(row)));
  }

  async insert(input: InsertPublicationAttemptEntityDto) {
    const value = publicationAttemptEntityToRecord(input);
    const row = await this.database.publicationAttempt.create({
      data: {
        id: value.id,
        publicationId: value.publication_id,
        attemptNumber: value.attempt_number,
        idempotencyKey: value.idempotency_key,
        resumableSessionReference: value.resumable_session_reference,
        acknowledgedBytes: value.acknowledged_bytes,
        totalBytes: value.total_bytes,
        stage: value.stage,
        progressPercent: value.progress_percent,
        finalChunkDispatchStartedAt: value.final_chunk_dispatch_started_at,
        outcomeUncertainAt: value.outcome_uncertain_at,
        reconciliationCheckedAt: value.reconciliation_checked_at,
        reconciliationResult: value.reconciliation_result,
        duplicateRiskAcknowledgedAt: value.duplicate_risk_acknowledged_at,
        sanitizedErrorCode: value.sanitized_error_code,
        sanitizedErrorMessage: value.sanitized_error_message,
        startedAt: value.started_at,
        completedAt: value.completed_at,
        updatedAt: value.updated_at,
      },
      select,
    });
    return publicationAttemptRecordToEntity(record(row));
  }

  async saveProgress(input: SaveAttemptProgressEntityDto) {
    const result = await this.database.publicationAttempt.updateMany({
      where: {
        id: input.id,
        acknowledgedBytes: { lte: input.acknowledgedBytes },
      },
      data: {
        acknowledgedBytes: input.acknowledgedBytes,
        totalBytes: input.totalBytes,
        progressPercent: input.progressPercent,
        stage: input.stage,
        updatedAt: input.updatedAt,
      },
    });
    return result.count === 1
      ? this.findById(input.id)
      : this.findById(input.id);
  }

  async finish(input: FinishAttemptEntityDto) {
    const result = await this.database.publicationAttempt.updateMany({
      where: { id: input.id },
      data: {
        stage: input.stage,
        completedAt: input.completedAt,
        sanitizedErrorCode: input.sanitizedErrorCode,
        sanitizedErrorMessage: input.sanitizedErrorMessage,
        updatedAt: input.updatedAt,
      },
    });
    return result.count === 1 ? this.findById(input.id) : null;
  }

  async markFinalChunkDispatchStarted(
    id: PublicationAttemptId,
    startedAt: Date,
  ) {
    await this.database.publicationAttempt.updateMany({
      where: { id, finalChunkDispatchStartedAt: null },
      data: {
        finalChunkDispatchStartedAt: startedAt,
        updatedAt: startedAt,
      },
    });
    return this.findById(id);
  }

  async markOutcomeUncertain(id: PublicationAttemptId, uncertainAt: Date) {
    await this.database.publicationAttempt.updateMany({
      where: {
        id,
        finalChunkDispatchStartedAt: { not: null },
        outcomeUncertainAt: null,
      },
      data: {
        stage: PublicationAttemptStage.OutcomeUncertain,
        outcomeUncertainAt: uncertainAt,
        updatedAt: uncertainAt,
      },
    });
    return this.findById(id);
  }

  async recordReconciliation(
    id: PublicationAttemptId,
    checkedAt: Date,
    result: NonNullable<PublicationAttemptRecordDto['reconciliation_result']>,
  ) {
    await this.database.publicationAttempt.updateMany({
      where: {
        id,
        outcomeUncertainAt: { not: null },
        reconciliationCheckedAt: null,
      },
      data: {
        stage: PublicationAttemptStage.Reconciling,
        reconciliationCheckedAt: checkedAt,
        reconciliationResult: result,
        updatedAt: checkedAt,
      },
    });
    return this.findById(id);
  }

  async acknowledgeDuplicateRisk(
    id: PublicationAttemptId,
    acknowledgedAt: Date,
  ) {
    await this.database.publicationAttempt.updateMany({
      where: {
        id,
        reconciliationCheckedAt: { not: null },
        duplicateRiskAcknowledgedAt: null,
      },
      data: {
        duplicateRiskAcknowledgedAt: acknowledgedAt,
        updatedAt: acknowledgedAt,
      },
    });
    return this.findById(id);
  }
}
