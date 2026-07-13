import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
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
        sha256: async () => {
          throw new Error('must not sha256');
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
  const h = uploadHarness({ completed: parts, totalParts: 2 });
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
  const h = uploadHarness({ completed: parts, totalParts: 2 });
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
  const h = uploadHarness({ completed: parts, totalParts: 2 });
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

it('uses a server-read full-object checksum, not multipart checksum metadata', async () => {
  const h = uploadHarness({ completed: parts, totalParts: 2 });
  const sha256 = vi.fn().mockResolvedValue('a'.repeat(64));
  const attachUploadedObject = vi.fn();
  const service = new CompleteUploadService(
    h.sessions,
    { attachUploadedObject } as never,
    h.multipart,
    {
      head: async () => ({ sizeBytes: 16n, versionId: null }),
      sha256,
      deleteMany: async () => {},
    },
    { execute: async (work) => work({} as never) },
  );

  const result = await service.execute({
    projectId: h.projectId,
    sessionId: h.sessionId,
    sha256: 'a'.repeat(64),
    parts,
  });

  expect(sha256).toHaveBeenCalledWith(
    `projects/${h.projectId}/sources/${h.sessionId}.mp4`,
  );
  expect(result.reference.sha256).toBe('a'.repeat(64));
  expect(attachUploadedObject).toHaveBeenCalledOnce();
});

it('deletes object when server-read full checksum differs from client claim', async () => {
  const h = uploadHarness({ completed: parts, totalParts: 2 });
  const deleteMany = vi.fn();
  const service = new CompleteUploadService(
    h.sessions,
    { attachUploadedObject: vi.fn() } as never,
    h.multipart,
    {
      head: async () => ({ sizeBytes: 16n, versionId: null }),
      sha256: async () => 'b'.repeat(64),
      deleteMany,
    },
    { execute: async (work) => work({} as never) },
  );

  await expect(
    service.execute({
      projectId: h.projectId,
      sessionId: h.sessionId,
      sha256: 'a'.repeat(64),
      parts,
    }),
  ).rejects.toMatchObject({ code: 'INVALID_SHA256' });
  expect(deleteMany).toHaveBeenCalledOnce();
});

it.each([
  [
    'a middle part is missing',
    [
      { partNumber: 1, etag: 'a', sizeBytes: 8n },
      { partNumber: 3, etag: 'c', sizeBytes: 8n },
    ],
  ],
  [
    'the last part is missing',
    [
      { partNumber: 1, etag: 'a', sizeBytes: 8n },
      { partNumber: 2, etag: 'b', sizeBytes: 8n },
    ],
  ],
])('rejects completion when %s', async (_name, incomplete) => {
  const h = uploadHarness({
    completed: incomplete as readonly (typeof parts)[number][],
    totalParts: 3,
  });
  const service = new CompleteUploadService(
    h.sessions,
    {} as never,
    h.multipart,
    {} as never,
    {} as never,
  );

  await expect(
    service.execute({
      projectId: h.projectId,
      sessionId: h.sessionId,
      sha256: 'a'.repeat(64),
      parts: incomplete as readonly (typeof parts)[number][],
    }),
  ).rejects.toMatchObject({ code: 'INVALID_PART' });
});
