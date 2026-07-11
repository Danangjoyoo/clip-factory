import type { UploadSessionRepository } from '../../../application/ports/upload-session.repository';
import type { ImmutableObjectReference } from '../../../application/ports/artifact-store.port';
import type { UploadSessionEntityDto } from '../../../application/dto/entity/upload-session-entity.dto';
import type { TransactionContext } from '../../../../projects/application/ports/project.repository';
import { prisma } from '../../../../../infrastructure/prisma/client';

type Db = typeof prisma;

export class PrismaUploadSessionRepository implements UploadSessionRepository {
  private db(tx?: TransactionContext): Db['uploadSession'] {
    return (tx as { uploadSession?: Db['uploadSession'] } | undefined)?.uploadSession ?? prisma.uploadSession;
  }

  private entity(row: {
    id: string; projectId: string; sourceAssetId: string; fileName: string; contentType: string; totalParts: number; objectKey: string;
    uploadId: string; sizeBytes: bigint; completionPartsHash: string | null; objectVersionId: string | null;
    objectSha256: string | null; status: 'CREATED' | 'UPLOADING' | 'COMPLETED' | 'ABORTED' | 'EXPIRED'; expiresAt: Date; createdAt: Date; updatedAt: Date;
  }): UploadSessionEntityDto {
    const status = row.status === 'CREATED' || row.status === 'UPLOADING' ? 'ACTIVE' : row.status;
    return { id: row.id, projectId: row.projectId, sourceAssetId: row.sourceAssetId, kind: 'BROWSER_UPLOAD', objectKey: row.objectKey, uploadId: row.uploadId, fileName: row.fileName, contentType: row.contentType, declaredSizeBytes: row.sizeBytes, totalParts: row.totalParts, status, completedPartsHash: row.completionPartsHash, objectReference: row.objectSha256 ? { key: row.objectKey, versionId: row.objectVersionId, sha256: row.objectSha256, sizeBytes: row.sizeBytes } : null, expiresAt: row.expiresAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  async create(session: UploadSessionEntityDto, tx?: TransactionContext) {
    const row = await this.db(tx).create({ data: { id: session.id, projectId: session.projectId, sourceAssetId: session.sourceAssetId, fileName: session.fileName, contentType: session.contentType, totalParts: session.totalParts, objectKey: session.objectKey, uploadId: session.uploadId, sizeBytes: session.declaredSizeBytes, completedPartsJson: [], status: 'UPLOADING', expiresAt: session.expiresAt } });
    return this.entity(row);
  }

  async requireOwned(sessionId: string, projectId: string, tx?: TransactionContext) {
    const row = await this.db(tx).findFirst({ where: { id: sessionId, projectId } });
    if (!row) throw new Error('UPLOAD_SESSION_NOT_FOUND');
    return this.entity(row);
  }

  async markCompleted(sessionId: string, reference: ImmutableObjectReference, tx: TransactionContext, completionPartsHash?: string) {
    const row = await this.db(tx).update({ where: { id: sessionId }, data: { status: 'COMPLETED', ...(completionPartsHash ? { completionPartsHash } : {}), objectVersionId: reference.versionId, objectSha256: reference.sha256 } });
    return this.entity(row);
  }

  async markAborted(sessionId: string, tx?: TransactionContext) {
    const row = await this.db(tx).update({ where: { id: sessionId }, data: { status: 'ABORTED' } });
    return this.entity(row);
  }
}
