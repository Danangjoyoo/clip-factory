import { createHash } from 'node:crypto';
import type { ArtifactStorePort, ImmutableObjectReference } from '../ports/artifact-store.port';
import type { MultipartUploadPort, CompletedPart } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import type { SourceAssetDataService } from '../../../projects/application/data-services/source-asset.data-service';
import type { UnitOfWork } from '../../../projects/application/ports/unit-of-work.port';
import { assertNotExpired, assertPart, UploadError } from './upload-policy';
export class CompleteUploadService {
  constructor(private readonly sessions: UploadSessionDataService, private readonly sources: SourceAssetDataService, private readonly multipart: MultipartUploadPort, private readonly artifacts: ArtifactStorePort, private readonly uow: UnitOfWork) {}
  async execute(input: Readonly<{ projectId: string; sessionId: string; parts: readonly CompletedPart[] }>) {
    const session = await this.sessions.requireOwned(input.sessionId, input.projectId);
    assertNotExpired(session.expiresAt);
    const parts = [...input.parts].sort((a, b) => a.partNumber - b.partNumber);
    parts.forEach((part) => assertPart(part.partNumber));
    const unique = new Set(parts.map((part) => part.partNumber));
    if (unique.size !== parts.length) throw new UploadError('INVALID_PART');
    if (parts.reduce((sum, part) => sum + part.sizeBytes, 0n) !== session.declaredSizeBytes) throw new UploadError('UPLOAD_SIZE_MISMATCH');
    const partsHash = createHash('sha256').update(JSON.stringify(parts, (_, value) => typeof value === 'bigint' ? value.toString() : value)).digest('hex');
    if (session.status === 'COMPLETED') {
      if (session.completedPartsHash === partsHash && session.objectReference) return { session, reference: session.objectReference, partsHash } as const;
      throw new UploadError('UPLOAD_ALREADY_COMPLETED_CONFLICT');
    }
    const uploadedParts = await this.multipart.listParts(session.objectKey, session.uploadId);
    const uploadedByNumber = new Map(uploadedParts.map((part) => [part.partNumber, part]));
    if (parts.some((part) => uploadedByNumber.get(part.partNumber)?.etag !== part.etag)) throw new UploadError('INVALID_PART');
    const completed = await this.multipart.complete(session.objectKey, session.uploadId, parts);
    const head = await this.artifacts.head(session.objectKey);
    if (head.sizeBytes !== session.declaredSizeBytes) { await this.artifacts.deleteMany([session.objectKey]); throw new UploadError('UPLOAD_SIZE_MISMATCH'); }
    if (!head.sha256 || !/^[0-9a-f]{64}$/u.test(head.sha256)) { await this.artifacts.deleteMany([session.objectKey]); throw new UploadError('INVALID_SHA256'); }
    if (completed.versionId !== null && head.versionId !== null && completed.versionId !== head.versionId) { await this.artifacts.deleteMany([session.objectKey]); throw new UploadError('INVALID_VERSION'); }
    const reference: ImmutableObjectReference = { key: session.objectKey, versionId: head.versionId ?? completed.versionId, sha256: head.sha256, sizeBytes: head.sizeBytes };
    const result = await this.uow.execute(async (tx) => { const updated = await this.sessions.markCompleted(session.id, reference, tx, partsHash); await this.sources.attachUploadedObject(input.projectId, reference, tx); return updated; });
    return { session: result, reference, partsHash } as const;
  }
}
