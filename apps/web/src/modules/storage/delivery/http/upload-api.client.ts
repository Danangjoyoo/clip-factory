const PART_BYTES = 5 * 1024 * 1024;

type UploadStart = Readonly<{ sessionId: string }>;
type UploadPart = Readonly<{ partNumber: number; url: string }>;
type UploadParts = Readonly<{ parts: readonly UploadPart[] }>;

const sha256 = async (file: File) => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', await file.arrayBuffer()),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
};

async function json<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  throw new Error('UPLOAD_FAILED');
}

export async function uploadProjectFile(
  projectId: string,
  sourceAssetId: string,
  file: File,
): Promise<void> {
  const fileSha256 = await sha256(file);
  const totalParts = Math.max(1, Math.ceil(file.size / PART_BYTES));
  const start = await json<UploadStart>(
    await fetch(`/api/projects/${projectId}/uploads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sourceAssetId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: String(file.size),
        totalParts,
      }),
    }),
  );
  const presigned = await json<UploadParts>(
    await fetch(
      `/api/projects/${projectId}/uploads/${start.sessionId}/parts?totalParts=${totalParts}`,
    ),
  );
  const parts = await Promise.all(
    presigned.parts.map(async (part) => {
      const startByte = (part.partNumber - 1) * PART_BYTES;
      const response = await fetch(part.url, {
        method: 'PUT',
        body: file.slice(
          startByte,
          Math.min(startByte + PART_BYTES, file.size),
        ),
        headers: { 'content-type': file.type || 'application/octet-stream' },
      });
      const etag = response.headers.get('etag');
      if (!response.ok || !etag) throw new Error('UPLOAD_FAILED');
      return {
        partNumber: part.partNumber,
        etag,
        sizeBytes: String(Math.min(PART_BYTES, file.size - startByte)),
      };
    }),
  );
  await json(
    await fetch(
      `/api/projects/${projectId}/uploads/${start.sessionId}/complete`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sha256: fileSha256, parts }),
      },
    ),
  );
}
