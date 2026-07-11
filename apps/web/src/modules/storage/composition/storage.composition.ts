import { UploadSessionDataService } from '../application/data-services/upload-session.data-service';
import { PrismaUploadSessionRepository } from '../adapters/persistence/repositories/prisma-upload-session.repository';
import { S3MultipartUploadAdapter } from '../adapters/clients/minio/s3-multipart-upload.adapter';
import { StartUploadService } from '../application/services/start-upload.service';
import { UploadController } from '../delivery/http/upload.controller';
export function storageComposition() { const multipart = new S3MultipartUploadAdapter(); const start = new StartUploadService(new UploadSessionDataService(new PrismaUploadSessionRepository()), multipart); return { start: new UploadController(start), multipart }; }
