import { expect, it } from 'vitest';
import { AbortUploadService } from './abort-upload.service';
import { uploadHarness } from '../../testing/upload-harness';

it('aborts the multipart upload before persisting terminal state', async () => {
  const h = uploadHarness();
  let aborted = false;
  h.multipart.abort = async () => {
    aborted = true;
  };
  await new AbortUploadService(h.sessions, h.multipart, {
    execute: (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  } as never).execute({ projectId: h.projectId, sessionId: h.sessionId });
  expect(aborted).toBe(true);
});
