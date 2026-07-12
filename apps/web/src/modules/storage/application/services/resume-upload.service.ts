import type { MultipartUploadPort } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import { assertNotExpired, UploadError } from './upload-policy';
export class ResumeUploadService {
  constructor(
    private readonly sessions: UploadSessionDataService,
    private readonly multipart: MultipartUploadPort,
  ) {}
  async execute(
    input: Readonly<{
      projectId: string;
      sessionId: string;
      totalParts: number;
      checksums: readonly { partNumber: number; checksumSha256: string }[];
    }>,
  ) {
    const session = await this.sessions.requireOwned(
      input.sessionId,
      input.projectId,
    );
    assertNotExpired(session.expiresAt);
    if (
      !Number.isInteger(input.totalParts) ||
      input.totalParts !== session.totalParts
    )
      throw new UploadError('INVALID_PART');
    const checksumByPart = new Map(
      input.checksums.map((part) => [part.partNumber, part.checksumSha256]),
    );
    if (
      checksumByPart.size !== session.totalParts ||
      [...checksumByPart.keys()].some(
        (partNumber) => partNumber < 1 || partNumber > session.totalParts,
      )
    )
      throw new UploadError('INVALID_PART');
    const completed = await this.multipart.listParts(
      session.objectKey,
      session.uploadId,
    );
    const completedNumbers = new Set(completed.map((part) => part.partNumber));
    const parts: Array<{
      partNumber: number;
      url: string;
      expiresSeconds: 900;
    }> = [];
    for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1)
      if (!completedNumbers.has(partNumber))
        parts.push({
          partNumber,
          url: await this.multipart.presignPart(
            session.objectKey,
            session.uploadId,
            partNumber,
            checksumByPart.get(partNumber) as string,
            900,
          ),
          expiresSeconds: 900,
        });
    return { objectKey: session.objectKey, completed, parts } as const;
  }
}
