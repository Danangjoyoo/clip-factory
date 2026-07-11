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
