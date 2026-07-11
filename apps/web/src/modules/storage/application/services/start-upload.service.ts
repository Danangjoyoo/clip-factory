import { randomUUID } from 'node:crypto';
import type { MultipartUploadPort } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import { sourceObjectKey, validateUpload } from './upload-policy';
import type { UploadSessionEntityDto } from '../dto/entity/upload-session-entity.dto';
import type { SourceAssetDataService } from '../../../projects/application/data-services/source-asset.data-service';
export class StartUploadService {
  constructor(
    private readonly sessions: UploadSessionDataService,
    private readonly multipart: MultipartUploadPort,
    private readonly sources?: SourceAssetDataService,
  ) {}
  async execute(
    input: Readonly<{
      projectId: string;
      sourceAssetId: string;
      fileName: string;
      contentType: string;
      sizeBytes: bigint;
      totalParts: number;
    }>,
  ) {
    validateUpload(input.sizeBytes, input.totalParts);
    if (this.sources) {
      const source = await this.sources.findById(input.sourceAssetId);
      if (
        !source ||
        source.projectId !== input.projectId ||
        source.kind !== 'BROWSER_UPLOAD'
      )
        throw new Error('SOURCE_NOT_OWNED');
    }
    const sessionId = randomUUID();
    const key = sourceObjectKey(input.projectId, sessionId, input.fileName);
    const { uploadId } = await this.multipart.create(key, input.contentType);
    if (!uploadId) throw new Error('UPLOAD_CREATE_FAILED');
    const now = new Date();
    const session: UploadSessionEntityDto = {
      id: sessionId,
      projectId: input.projectId,
      sourceAssetId: input.sourceAssetId,
      kind: 'BROWSER_UPLOAD',
      objectKey: key,
      uploadId,
      fileName: input.fileName,
      contentType: input.contentType,
      declaredSizeBytes: input.sizeBytes,
      totalParts: input.totalParts,
      status: 'ACTIVE',
      completedPartsHash: null,
      objectReference: null,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
    await this.sessions.create(session);
    return { sessionId, objectKey: key, uploadId, parts: [] as const };
  }
}
