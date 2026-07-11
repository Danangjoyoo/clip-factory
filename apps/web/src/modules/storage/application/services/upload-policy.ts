export type UploadErrorCode =
  | 'INVALID_PART'
  | 'TOO_MANY_PARTS'
  | 'INVALID_FILENAME'
  | 'SOURCE_TOO_LARGE'
  | 'UPLOAD_SIZE_MISMATCH'
  | 'UPLOAD_EXPIRED'
  | 'UPLOAD_ALREADY_COMPLETED_CONFLICT'
  | 'INVALID_SHA256'
  | 'INVALID_VERSION';
export class UploadError extends Error {
  constructor(readonly code: UploadErrorCode) {
    super(code);
    this.name = 'UploadError';
  }
}
const MAX_SOURCE_BYTES = 10n * 1024n * 1024n * 1024n;
const EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm']);
export function sourceObjectKey(
  projectId: string,
  sessionId: string,
  fileName: string,
): string {
  const base = fileName.split(/[\\/]/u).at(-1) ?? '';
  const extension = base.split('.').at(-1)?.toLowerCase() ?? '';
  if (!base || base !== fileName || !EXTENSIONS.has(extension))
    throw new UploadError('INVALID_FILENAME');
  return `projects/${projectId}/sources/${sessionId}.${extension}`;
}
export function validateUpload(sizeBytes: bigint, totalParts: number): void {
  if (sizeBytes < 1n || sizeBytes > MAX_SOURCE_BYTES)
    throw new UploadError('SOURCE_TOO_LARGE');
  if (!Number.isInteger(totalParts) || totalParts < 1 || totalParts > 10000)
    throw new UploadError('TOO_MANY_PARTS');
}
export function assertPart(partNumber: number): void {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000)
    throw new UploadError('INVALID_PART');
}
export function assertNotExpired(expiresAt: Date): void {
  if (expiresAt.getTime() <= Date.now())
    throw new UploadError('UPLOAD_EXPIRED');
}
