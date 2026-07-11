import { expect, it } from 'vitest';
import { S3MultipartUploadAdapter } from './s3-multipart-upload.adapter';
it('rejects unscoped object keys and unsafe upload ids', async () => {
  const adapter = new S3MultipartUploadAdapter({
    send: async () => ({}),
  } as never);
  await expect(adapter.listParts('../escape', 'upload')).rejects.toThrow(
    'INVALID_OBJECT_KEY',
  );
  await expect(
    adapter.listParts('projects/p/sources/x.mp4', '../upload'),
  ).rejects.toThrow('INVALID_UPLOAD_ID');
});
