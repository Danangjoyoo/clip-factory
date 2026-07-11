import { UploadSessionDataService } from '../application/data-services/upload-session.data-service';
import { PrismaUploadSessionRepository } from '../adapters/persistence/repositories/prisma-upload-session.repository';
import { S3MultipartUploadAdapter } from '../adapters/clients/minio/s3-multipart-upload.adapter';
import { StartUploadService } from '../application/services/start-upload.service';
import { UploadController } from '../delivery/http/upload.controller';
import { ResumeUploadService } from '../application/services/resume-upload.service';
import { CompleteUploadService } from '../application/services/complete-upload.service';
import { PrismaSourceAssetRepository } from '../../projects/adapters/persistence/repositories/prisma-source-asset.repository';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import { prisma } from '../../../infrastructure/prisma/client';
export function storageComposition() {
  const multipart = new S3MultipartUploadAdapter();
  const sessions = new UploadSessionDataService(
    new PrismaUploadSessionRepository(),
  );
  const uow = {
    execute: <T>(fn: (tx: unknown) => Promise<T>) =>
      prisma.$transaction((tx) => fn(tx)),
  };
  const sources = new SourceAssetDataService(new PrismaSourceAssetRepository());
  const start = new StartUploadService(sessions, multipart, sources);
  const resume = new ResumeUploadService(sessions, multipart);
  const complete = new CompleteUploadService(
    sessions,
    sources,
    multipart,
    multipart,
    uow,
  );
  const controller = new UploadController(start, resume, complete);
  return { start: controller, controller, resume, complete, multipart };
}
