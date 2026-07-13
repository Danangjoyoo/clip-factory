import type {
  PublicationAttemptId,
  PublicationId,
} from '../../../../shared/domain';
import type {
  PublicationAttemptEntityDto,
  PublicationAttemptStage,
} from '../dto/entity/youtube-publishing-entity.dto';

export type InsertPublicationAttemptEntityDto = PublicationAttemptEntityDto;

export type SaveAttemptProgressEntityDto = Pick<
  PublicationAttemptEntityDto,
  | 'id'
  | 'acknowledgedBytes'
  | 'totalBytes'
  | 'progressPercent'
  | 'stage'
  | 'updatedAt'
>;

export type FinishAttemptEntityDto = Pick<
  PublicationAttemptEntityDto,
  | 'id'
  | 'stage'
  | 'completedAt'
  | 'sanitizedErrorCode'
  | 'sanitizedErrorMessage'
  | 'updatedAt'
>;

export interface PublicationAttemptRepositoryPort {
  findById(
    id: PublicationAttemptId,
  ): Promise<PublicationAttemptEntityDto | null>;
  requireCurrentForUpdate(
    publicationId: PublicationId,
  ): Promise<PublicationAttemptEntityDto>;
  listByPublication(
    publicationId: PublicationId,
  ): Promise<readonly PublicationAttemptEntityDto[]>;
  insert(
    input: InsertPublicationAttemptEntityDto,
  ): Promise<PublicationAttemptEntityDto>;
  saveProgress(
    input: SaveAttemptProgressEntityDto,
  ): Promise<PublicationAttemptEntityDto | null>;
  finish(
    input: FinishAttemptEntityDto,
  ): Promise<PublicationAttemptEntityDto | null>;
  markFinalChunkDispatchStarted(
    id: PublicationAttemptId,
    startedAt: Date,
  ): Promise<PublicationAttemptEntityDto | null>;
  markOutcomeUncertain(
    id: PublicationAttemptId,
    uncertainAt: Date,
  ): Promise<PublicationAttemptEntityDto | null>;
  recordReconciliation(
    id: PublicationAttemptId,
    checkedAt: Date,
    result: NonNullable<PublicationAttemptEntityDto['reconciliationResult']>,
  ): Promise<PublicationAttemptEntityDto | null>;
  acknowledgeDuplicateRisk(
    id: PublicationAttemptId,
    acknowledgedAt: Date,
  ): Promise<PublicationAttemptEntityDto | null>;
}
