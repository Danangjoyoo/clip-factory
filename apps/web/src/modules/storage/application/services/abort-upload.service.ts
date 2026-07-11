import type { MultipartUploadPort } from '../ports/multipart-upload.port';
import type { UploadSessionDataService } from '../data-services/upload-session.data-service';
import type { UnitOfWork } from '../../../projects/application/ports/unit-of-work.port';
export class AbortUploadService {
  constructor(
    private readonly sessions: UploadSessionDataService,
    private readonly multipart: MultipartUploadPort,
    private readonly uow: UnitOfWork,
  ) {}
  async execute(input: Readonly<{ projectId: string; sessionId: string }>) {
    const session = await this.sessions.requireOwned(
      input.sessionId,
      input.projectId,
    );
    await this.multipart.abort(session.objectKey, session.uploadId);
    return this.uow.execute((tx) => this.sessions.markAborted(session.id, tx));
  }
}
