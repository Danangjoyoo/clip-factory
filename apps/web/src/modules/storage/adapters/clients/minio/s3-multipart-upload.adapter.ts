import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ArtifactStorePort } from '../../../application/ports/artifact-store.port';
import type {
  CompletedPart,
  MultipartUploadPort,
} from '../../../application/ports/multipart-upload.port';
import {
  assertPart,
  UploadError,
} from '../../../application/services/upload-policy';

export const minioClientOptions = () => ({
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000',
  forcePathStyle: true,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
});

export const minioPublicClientOptions = () => ({
  ...minioClientOptions(),
  endpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? 'http://127.0.0.1:9000',
});

export class S3MultipartUploadAdapter
  implements MultipartUploadPort, ArtifactStorePort
{
  private readonly bucket = 'clip-factory';
  constructor(
    private readonly client = new S3Client(minioClientOptions()),
    private readonly presignClient = new S3Client(minioPublicClientOptions()),
  ) {}
  private key(key: string) {
    if (!/^projects\/[^/]+\/sources\/[^/]+\.(?:mp4|mov|mkv|webm)$/u.test(key))
      throw new Error('INVALID_OBJECT_KEY');
    return key;
  }
  private upload(uploadId: string) {
    if (!/^[A-Za-z0-9._-]{1,300}$/u.test(uploadId))
      throw new Error('INVALID_UPLOAD_ID');
    return uploadId;
  }
  private safe<T>(fn: () => Promise<T>): Promise<T> {
    return fn().catch(() => {
      throw new Error('OBJECT_STORAGE_ERROR');
    });
  }
  async create(key: string, contentType: string) {
    if (!/^[\w!#$&^+.-]+\/[\w!#$&^+.-]+$/u.test(contentType))
      throw new Error('INVALID_CONTENT_TYPE');
    const r = await this.safe(() =>
      this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          ContentType: contentType,
          ChecksumAlgorithm: 'SHA256',
        }),
      ),
    );
    if (!r.UploadId) throw new Error('UPLOAD_CREATE_FAILED');
    return { uploadId: r.UploadId };
  }
  async presignPart(
    key: string,
    uploadId: string,
    partNumber: number,
    checksumSha256: string,
    expiresSeconds: 900,
  ) {
    assertPart(partNumber);
    return this.safe(() =>
      getSignedUrl(
        this.presignClient,
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          UploadId: this.upload(uploadId),
          PartNumber: partNumber,
          ChecksumSHA256: checksumSha256,
        }),
        { expiresIn: expiresSeconds },
      ),
    );
  }
  async listParts(key: string, uploadId: string) {
    const r = await this.safe(() =>
      this.client.send(
        new ListPartsCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          UploadId: this.upload(uploadId),
        }),
      ),
    );
    return (r.Parts ?? [])
      .filter((p) => p.PartNumber !== undefined && p.PartNumber > 0 && p.ETag)
      .map((p) => ({
        partNumber: p.PartNumber as number,
        etag: p.ETag as string,
        sizeBytes: BigInt(p.Size ?? 0),
      }));
  }
  async complete(
    key: string,
    uploadId: string,
    parts: readonly CompletedPart[],
  ) {
    parts.forEach((p) => assertPart(p.partNumber));
    const r = await this.safe(() =>
      this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          UploadId: this.upload(uploadId),
          MultipartUpload: {
            Parts: parts.map((p) => ({
              PartNumber: p.partNumber,
              ETag: p.etag,
            })),
          },
        }),
      ),
    );
    return { versionId: r.VersionId ?? null };
  }
  async abort(key: string, uploadId: string) {
    await this.safe(() =>
      this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          UploadId: this.upload(uploadId),
        }),
      ),
    );
  }
  async head(key: string) {
    const r = await this.safe(() =>
      this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.key(key),
          ChecksumMode: 'ENABLED',
        }),
      ),
    );
    return {
      sizeBytes: BigInt(r.ContentLength ?? 0),
      versionId: r.VersionId ?? null,
    };
  }
  async sha256(key: string) {
    return this.safe(async () => {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(key) }),
      );
      const body = result.Body as AsyncIterable<Uint8Array> | undefined;
      if (!body?.[Symbol.asyncIterator])
        throw new Error('OBJECT_STORAGE_ERROR');
      const hash = createHash('sha256');
      for await (const chunk of body) hash.update(chunk);
      return hash.digest('hex');
    });
  }
  async deleteMany(keys: readonly string[]) {
    await Promise.all(
      keys.map((key) =>
        this.safe(() =>
          this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: this.key(key),
            }),
          ),
        ),
      ),
    );
  }
  async presign(key: string, expiresSeconds = 900) {
    return this.safe(() =>
      getSignedUrl(
        this.presignClient,
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(key) }),
        { expiresIn: expiresSeconds },
      ),
    );
  }
}
