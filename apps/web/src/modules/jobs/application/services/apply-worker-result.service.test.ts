import { expect, it } from 'vitest';
import { makeJobServiceHarness } from '../../testing/job-service-harness';
it('replays a terminal callback without mutating twice', async () => {
  const h = makeJobServiceHarness();
  const command = {
    workflowId: 'w',
    projectId: 'p',
    status: 'COMPLETED',
    completedAt: '2026-07-11T00:00:00Z',
    idempotencyKey: 'k',
    requestHash: 'a'.repeat(64),
  } as const;
  const first = await h.service.execute(command);
  const second = await h.service.execute(command);
  expect(second).toEqual(first);
  expect(h.projects.terminalMutationCount).toBe(1);
});
it('rejects reusing a key with another request', async () => {
  const h = makeJobServiceHarness();
  const command = {
    workflowId: 'w',
    projectId: 'p',
    status: 'COMPLETED',
    completedAt: '2026-07-11T00:00:00Z',
    idempotencyKey: 'k',
    requestHash: 'a'.repeat(64),
  } as const;
  await h.service.execute(command);
  await expect(
    h.service.execute({ ...command, requestHash: 'b'.repeat(64) }),
  ).rejects.toThrow('Idempotency key conflict');
});
