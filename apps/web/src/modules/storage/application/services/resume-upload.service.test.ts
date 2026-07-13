import { expect, it } from 'vitest';
import { ResumeUploadService } from './resume-upload.service';
import { uploadHarness } from '../../testing/upload-harness';
it('presigns only incomplete parts', async () => {
  const h = uploadHarness({
    completed: [{ partNumber: 1, etag: 'etag-1', sizeBytes: 8n }],
  });
  const result = await new ResumeUploadService(h.sessions, h.multipart).execute(
    {
      projectId: h.projectId,
      sessionId: h.sessionId,
      totalParts: 3,
      checksums: [
        { partNumber: 1, checksumSha256: 'a'.repeat(43) + '=' },
        { partNumber: 2, checksumSha256: 'b'.repeat(43) + '=' },
        { partNumber: 3, checksumSha256: 'c'.repeat(43) + '=' },
      ],
    },
  );
  expect(result.parts.map((part) => part.partNumber)).toEqual([2, 3]);
  expect(h.multipart.presigned).toEqual([2, 3]);
  expect(h.multipart.checksums).toEqual([
    'b'.repeat(43) + '=',
    'c'.repeat(43) + '=',
  ]);
});
