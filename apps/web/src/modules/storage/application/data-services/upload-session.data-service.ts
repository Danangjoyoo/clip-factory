import type { TransactionContext } from '../../../projects/application/ports/project.repository';
import type { ImmutableObjectReference } from '../ports/artifact-store.port';
import type { UploadSessionRepository } from '../ports/upload-session.repository';
export class UploadSessionDataService {
  constructor(private readonly repository: UploadSessionRepository) {}
  requireOwned(sessionId: string, projectId: string, tx?: TransactionContext) { return this.repository.requireOwned(sessionId, projectId, tx); }
  markCompleted(sessionId: string, reference: ImmutableObjectReference, tx: TransactionContext) { return this.repository.markCompleted(sessionId, reference, tx); }
  markAborted(sessionId: string, tx?: TransactionContext) { return this.repository.markAborted(sessionId, tx); }
}
