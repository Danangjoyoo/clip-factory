import { expect, it } from 'vitest';
import { StartUploadService } from './start-upload.service';
import { UploadError } from './upload-policy';

it('rejects invalid source sizes before creating an object', async () => {
  const multipart = { create: async () => ({ uploadId: 'unused' }) } as never;
  await expect(
    new StartUploadService(
      { create: async () => ({}) as never } as never,
      multipart,
    ).execute({
      projectId: 'p',
      sourceAssetId: 's',
      fileName: 'x.mp4',
      contentType: 'video/mp4',
      sizeBytes: 0n,
      totalParts: 1,
    }),
  ).rejects.toMatchObject({
    code: 'SOURCE_TOO_LARGE',
  } satisfies Partial<UploadError>);
});
