const PART_BYTES = 5 * 1024 * 1024;

type UploadStart = Readonly<{ sessionId: string }>;
type UploadPart = Readonly<{ partNumber: number; url: string }>;
type UploadParts = Readonly<{ parts: readonly UploadPart[] }>;

const digest = async (value: Blob) =>
  new Uint8Array(
    await crypto.subtle.digest('SHA-256', await value.arrayBuffer()),
  );

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const base64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
};

const sha256 = async (file: File) => hex(await digest(file));

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
  const checksums = await Promise.all(
    Array.from({ length: totalParts }, async (_, index) => ({
      partNumber: index + 1,
      checksumSha256: base64(
        await digest(
          file.slice(
            index * PART_BYTES,
            Math.min((index + 1) * PART_BYTES, file.size),
          ),
        ),
      ),
    })),
  );
  const checksumByPart = new Map(
    checksums.map((part) => [part.partNumber, part.checksumSha256]),
  );
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
    await fetch(`/api/projects/${projectId}/uploads/${start.sessionId}/parts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ totalParts, parts: checksums }),
    }),
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
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'x-amz-checksum-sha256': checksumByPart.get(
            part.partNumber,
          ) as string,
        },
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
