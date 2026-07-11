import { randomUUID } from 'node:crypto';
import type { MultipartUploadPort } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import { sourceObjectKey, validateUpload } from './upload-policy';
export class StartUploadService {
  constructor(private readonly sessions: UploadSessionDataService, private readonly multipart: MultipartUploadPort) {}
  async execute(input: Readonly<{ projectId: string; sourceAssetId: string; fileName: string; contentType: string; sizeBytes: bigint; totalParts: number; }>) {
    validateUpload(input.sizeBytes, input.totalParts);
    const sessionId = randomUUID();
    const key = sourceObjectKey(input.projectId, sessionId, input.fileName);
    const { uploadId } = await this.multipart.create(key, input.contentType);
    return { sessionId, objectKey: key, uploadId, parts: [] as const };
  }
}
