export type CompletedPart = Readonly<{
  partNumber: number;
  etag: string;
  sizeBytes: bigint;
}>;

export interface MultipartUploadPort {
  create(key: string, contentType: string): Promise<{ uploadId: string }>;
  presignPart(key: string, uploadId: string, partNumber: number, expiresSeconds: 900): Promise<string>;
  listParts(key: string, uploadId: string): Promise<readonly CompletedPart[]>;
  complete(key: string, uploadId: string, parts: readonly CompletedPart[]): Promise<{ versionId: string | null }>;
  abort(key: string, uploadId: string): Promise<void>;
}
