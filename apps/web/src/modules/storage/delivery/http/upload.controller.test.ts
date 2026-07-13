import { expect, it } from 'vitest';
import { UploadController } from './upload.controller';
import { UploadError } from '../../application/services/upload-policy';

it('maps typed upload failures to stable API codes', async () => {
  const response = UploadController.error(
    new UploadError('UPLOAD_SIZE_MISMATCH'),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'UPLOAD_SIZE_MISMATCH' });
});

it('returns a JSON-safe completion body after upload service succeeds', async () => {
  const controller = new UploadController({} as never, undefined, {
    execute: async () => ({
      session: { declaredSizeBytes: 1n },
      reference: { sizeBytes: 1n },
      partsHash: 'a'.repeat(64),
    }),
  } as never);

  const body = await controller.completeUpload('project-1', 'session-1', {
    sha256: 'b'.repeat(64),
    parts: [{ partNumber: 1, etag: 'etag-1', sizeBytes: '1' }],
  });

  expect(body).toEqual({ ok: true });
  expect(() => JSON.stringify(body)).not.toThrow();
});
