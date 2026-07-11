import { expect, it } from 'vitest';
import { CompleteUploadService } from './complete-upload.service';
import { uploadHarness } from '../../testing/upload-harness';

it('replays a completed session without calling storage again', async () => {
  const h = uploadHarness({
    completed: [
      { partNumber: 1, etag: 'a', sizeBytes: 8n },
      { partNumber: 2, etag: 'b', sizeBytes: 8n },
    ],
  });
  const reference = {
    key: `projects/${h.projectId}/sources/${h.sessionId}.mp4`,
    versionId: null,
    sha256: 'a'.repeat(64),
    sizeBytes: 16n,
  } as const;
  const session = await h.sessions.requireOwned(h.sessionId, h.projectId);
  Object.assign(session, {
    status: 'COMPLETED',
    objectReference: reference,
    completedPartsHash: 'hash',
  });
  const service = new CompleteUploadService(
    h.sessions,
    {
      attachUploadedObject: async () => {
        throw new Error('must not attach');
      },
    } as never,
    h.multipart,
    {
      head: async () => {
        throw new Error('must not head');
      },
      deleteMany: async () => {},
    },
    {
      execute: async () => {
        throw new Error('must not transact');
      },
    },
  );
  await expect(
    service.execute({
      projectId: h.projectId,
      sessionId: h.sessionId,
      parts: [
        { partNumber: 1, etag: 'a', sizeBytes: 8n },
        { partNumber: 2, etag: 'b', sizeBytes: 8n },
      ],
    }),
  ).rejects.toMatchObject({ code: 'UPLOAD_ALREADY_COMPLETED_CONFLICT' });
});
