import type { MultipartUploadPort } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import { assertNotExpired, UploadError } from './upload-policy';
export class ResumeUploadService {
  constructor(private readonly sessions: UploadSessionDataService, private readonly multipart: MultipartUploadPort) {}
  async execute(input: Readonly<{ projectId: string; sessionId: string; totalParts: number }>) {
    const session = await this.sessions.requireOwned(input.sessionId, input.projectId);
    assertNotExpired(session.expiresAt);
    if (!Number.isInteger(input.totalParts) || input.totalParts !== session.totalParts) throw new UploadError('INVALID_PART');
    const completed = await this.multipart.listParts(session.objectKey, session.uploadId);
    const completedNumbers = new Set(completed.map((part) => part.partNumber));
    const parts: Array<{ partNumber: number; url: string; expiresSeconds: 900 }> = [];
    for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) if (!completedNumbers.has(partNumber)) parts.push({ partNumber, url: await this.multipart.presignPart(session.objectKey, session.uploadId, partNumber, 900), expiresSeconds: 900 });
    return { objectKey: session.objectKey, completed, parts } as const;
  }
}
