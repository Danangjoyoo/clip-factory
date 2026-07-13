import { randomUUID } from 'node:crypto';
import type { UploadSessionEntityDto } from '../application/dto/entity/upload-session-entity.dto';
import type { UploadSessionRepository } from '../application/ports/upload-session.repository';
import type {
  MultipartUploadPort,
  CompletedPart,
} from '../application/ports/multipart-upload.port';
import { UploadSessionDataService } from '../application/data-services/upload-session.data-service';
export function uploadHarness(
  input: { completed?: readonly CompletedPart[]; totalParts?: number } = {},
) {
  const projectId = randomUUID();
  const sessionId = randomUUID();
  const session: UploadSessionEntityDto = {
    id: sessionId,
    projectId,
    sourceAssetId: randomUUID(),
    kind: 'BROWSER_UPLOAD',
    objectKey: `projects/${projectId}/sources/${sessionId}.mp4`,
    uploadId: 'upload',
    fileName: 'source.mp4',
    contentType: 'video/mp4',
    declaredSizeBytes: 16n,
    totalParts: input.totalParts ?? 3,
    status: 'ACTIVE',
    completedPartsHash: null,
    objectReference: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository: UploadSessionRepository = {
    async create(value) {
      Object.assign(session, value);
      return session;
    },
    async requireOwned() {
      return session;
    },
    async markCompleted(_id, reference, _tx, completionPartsHash) {
      Object.assign(session, {
        status: 'COMPLETED',
        objectReference: reference,
        completedPartsHash: completionPartsHash ?? null,
      });
      return session;
    },
    async markAborted() {
      return session;
    },
  };
  const multipart = {
    presigned: [] as number[],
    checksums: [] as string[],
    async create() {
      return { uploadId: 'upload' };
    },
    async presignPart(_k: string, _u: string, n: number, checksum: string) {
      multipart.presigned.push(n);
      multipart.checksums.push(checksum);
      return `url-${n}`;
    },
    async listParts() {
      return input.completed ?? [];
    },
    async complete() {
      return { versionId: null };
    },
    async abort() {},
  } as MultipartUploadPort & { presigned: number[]; checksums: string[] };
  return {
    projectId,
    sessionId,
    sessions: new UploadSessionDataService(repository),
    multipart,
  };
}
