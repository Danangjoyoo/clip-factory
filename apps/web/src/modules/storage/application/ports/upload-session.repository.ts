import type { ImmutableObjectReference } from './artifact-store.port';
import type { UploadSessionEntityDto } from '../dto/entity/upload-session-entity.dto';
import type { TransactionContext } from '../../../projects/application/ports/project.repository';

export interface UploadSessionRepository {
  create(
    session: UploadSessionEntityDto,
    transaction?: TransactionContext,
  ): Promise<UploadSessionEntityDto>;
  requireOwned(
    sessionId: string,
    projectId: string,
    transaction?: TransactionContext,
  ): Promise<UploadSessionEntityDto>;
  markCompleted(
    sessionId: string,
    reference: ImmutableObjectReference,
    transaction: TransactionContext,
    completionPartsHash?: string,
  ): Promise<UploadSessionEntityDto>;
  markAborted(
    sessionId: string,
    transaction?: TransactionContext,
  ): Promise<UploadSessionEntityDto>;
}
