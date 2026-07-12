import type { StartUploadService } from '../../application/services/start-upload.service';
import type { ResumeUploadService } from '../../application/services/resume-upload.service';
import type { CompleteUploadService } from '../../application/services/complete-upload.service';
import {
  CompleteUploadApiSchema,
  PresignUploadPartsApiSchema,
  StartUploadApiSchema,
} from './dto/api/upload-api.dto';
import { UploadError } from '../../application/services/upload-policy';
export class UploadController {
  constructor(
    private readonly start: StartUploadService,
    private readonly resume?: ResumeUploadService,
    private readonly complete?: CompleteUploadService,
  ) {}
  async startUpload(projectId: string, body: unknown) {
    const input = StartUploadApiSchema.parse(body);
    return this.start.execute({
      ...input,
      projectId,
      sizeBytes: BigInt(input.sizeBytes),
    });
  }
  async resumeUpload(projectId: string, sessionId: string, body: unknown) {
    if (!this.resume) throw new Error('UPLOAD_RESUME_UNAVAILABLE');
    const input = PresignUploadPartsApiSchema.parse(body);
    return this.resume.execute({
      projectId,
      sessionId,
      totalParts: input.totalParts,
      checksums: input.parts,
    });
  }
  async completeUpload(projectId: string, sessionId: string, body: unknown) {
    if (!this.complete) throw new Error('UPLOAD_COMPLETE_UNAVAILABLE');
    const input = CompleteUploadApiSchema.parse(body);
    return this.complete.execute({
      projectId,
      sessionId,
      sha256: input.sha256,
      parts: input.parts.map((part) => ({
        ...part,
        sizeBytes: BigInt(part.sizeBytes),
      })),
    });
  }
  static error(error: unknown) {
    if (error instanceof UploadError)
      return Response.json({ error: error.code }, { status: 400 });
    if (error instanceof Error && error.name === 'ZodError')
      return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    return Response.json({ error: 'UPLOAD_FAILED' }, { status: 500 });
  }
}
