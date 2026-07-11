import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, ListPartsCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ArtifactStorePort } from '../../../application/ports/artifact-store.port';
import type { CompletedPart, MultipartUploadPort } from '../../../application/ports/multipart-upload.port';
export class S3MultipartUploadAdapter implements MultipartUploadPort, ArtifactStorePort {
  private readonly bucket = 'clip-factory';
  constructor(private readonly client = new S3Client({ endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000', forcePathStyle: true, region: 'us-east-1', credentials: { accessKeyId: process.env.MINIO_ROOT_USER ?? 'minioadmin', secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin' } })) {}
  async create(key: string, contentType: string) { const r = await this.client.send(new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })); return { uploadId: r.UploadId ?? '' }; }
  async presignPart(key: string, uploadId: string, partNumber: number, expiresSeconds: 900) { return getSignedUrl(this.client, new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: expiresSeconds }); }
  async listParts(key: string, uploadId: string) { const r = await this.client.send(new ListPartsCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId })); return (r.Parts ?? []).filter((p) => p.PartNumber && p.ETag).map((p) => ({ partNumber: p.PartNumber as number, etag: p.ETag as string, sizeBytes: BigInt(p.Size ?? 0) })); }
  async complete(key: string, uploadId: string, parts: readonly CompletedPart[]) { const r = await this.client.send(new CompleteMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) } })); return { versionId: r.VersionId ?? null }; }
  async abort(key: string, uploadId: string) { await this.client.send(new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId })); }
  async head(key: string) { const r = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key })); return { sizeBytes: BigInt(r.ContentLength ?? 0), versionId: r.VersionId ?? null, sha256: r.Metadata?.sha256 ?? null }; }
  async deleteMany(keys: readonly string[]) { await Promise.all(keys.map((key) => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })))); }
  async presign(key: string, expiresSeconds = 900) { return getSignedUrl(this.client, new HeadObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresSeconds }); }
}
