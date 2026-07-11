import type { ImmutableObjectReference } from './artifact-store.port';
import type { UploadSessionEntityDto } from '../dto/entity/upload-session-entity.dto';
import type { TransactionContext } from '../../../projects/application/ports/project.repository';

export interface UploadSessionRepository {
  requireOwned(sessionId: string, projectId: string, transaction?: TransactionContext): Promise<UploadSessionEntityDto>;
  markCompleted(sessionId: string, reference: ImmutableObjectReference, transaction: TransactionContext): Promise<UploadSessionEntityDto>;
  markAborted(sessionId: string, transaction?: TransactionContext): Promise<UploadSessionEntityDto>;
}
