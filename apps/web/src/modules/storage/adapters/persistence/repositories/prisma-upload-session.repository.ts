import type { UploadSessionRepository } from '../../../application/ports/upload-session.repository';
import type { ImmutableObjectReference } from '../../../application/ports/artifact-store.port';
import type { UploadSessionEntityDto } from '../../../application/dto/entity/upload-session-entity.dto';
import type { TransactionContext } from '../../../../projects/application/ports/project.repository';
export class PrismaUploadSessionRepository implements UploadSessionRepository {
  async requireOwned(_sessionId: string, _projectId: string, _tx?: TransactionContext): Promise<UploadSessionEntityDto> { throw new Error('UploadSession persistence is not configured'); }
  async markCompleted(_sessionId: string, _reference: ImmutableObjectReference, _tx: TransactionContext): Promise<UploadSessionEntityDto> { throw new Error('UploadSession persistence is not configured'); }
  async markAborted(_sessionId: string, _tx?: TransactionContext): Promise<UploadSessionEntityDto> { throw new Error('UploadSession persistence is not configured'); }
}
