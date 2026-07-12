import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { CompleteUploadService } from './complete-upload.service';
import { uploadHarness } from '../../testing/upload-harness';

const parts = [
  { partNumber: 1, etag: 'a', sizeBytes: 8n },
  { partNumber: 2, etag: 'b', sizeBytes: 8n },
] as const;

const partsHash = createHash('sha256')
  .update(
    JSON.stringify(parts, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  )
  .digest('hex');

function completedService(h: ReturnType<typeof uploadHarness>) {
  const reference = {
    key: `projects/${h.projectId}/sources/${h.sessionId}.mp4`,
    versionId: null,
    sha256: 'a'.repeat(64),
    sizeBytes: 16n,
  } as const;
  const session = h.sessions.requireOwned(h.sessionId, h.projectId);
  return session.then((value) => {
    Object.assign(value, {
      status: 'COMPLETED',
      objectReference: reference,
      completedPartsHash: partsHash,
    });
    return new CompleteUploadService(
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
  });
}

it('replays an identical completed request without calling storage again', async () => {
  const h = uploadHarness({
    completed: parts,
  });
  const service = await completedService(h);
  const result = await service.execute({
    projectId: h.projectId,
    sessionId: h.sessionId,
    sha256: 'a'.repeat(64),
    parts,
  });
  expect(result.partsHash).toBe(partsHash);
  expect(result.reference.sha256).toBe('a'.repeat(64));
});

it('rejects a completed request with changed parts', async () => {
  const h = uploadHarness({ completed: parts });
  const service = await completedService(h);
  await expect(
    service.execute({
      projectId: h.projectId,
      sessionId: h.sessionId,
      sha256: 'a'.repeat(64),
      parts: [
        ...parts.slice(0, 1),
        { partNumber: 2, etag: 'changed', sizeBytes: 8n },
      ],
    }),
  ).rejects.toMatchObject({ code: 'UPLOAD_ALREADY_COMPLETED_CONFLICT' });
});

it('rejects a completed replay with a different checksum', async () => {
  const h = uploadHarness({ completed: parts });
  const service = await completedService(h);
  await expect(
    service.execute({
      projectId: h.projectId,
      sessionId: h.sessionId,
      sha256: 'b'.repeat(64),
      parts,
    }),
  ).rejects.toMatchObject({ code: 'UPLOAD_ALREADY_COMPLETED_CONFLICT' });
});
