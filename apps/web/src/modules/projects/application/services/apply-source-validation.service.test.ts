import { expect, it, vi } from 'vitest';
import { ApplySourceValidationService } from './apply-source-validation.service';
it('replays the same validation receipt without writing twice', async () => {
  const apply = vi.fn().mockResolvedValue({
    id: 'source',
    health: 'LOCATED',
    fingerprint: 'a'.repeat(64),
  });
  const receipts = new Map<string, any>();
  const service = new ApplySourceValidationService(
    { execute: (fn) => fn(undefined) },
    { applyValidatedLocator: apply } as never,
    {
      findByKey: async (key) => receipts.get(key) ?? null,
      createPending: async (key, requestHash) => {
        receipts.set(key, { requestHash, response: null });
      },
      complete: async (key, requestHash, response) => {
        receipts.set(key, { requestHash, response });
        return response;
      },
    },
  );
  const command = {
    sourceAssetId: 'source',
    kind: 'LOCAL_FILE' as const,
    resolvedPath: '/tmp/video.mp4',
    sizeBytes: 1n,
    modifiedAt: '2026-07-11T00:00:00Z',
    fingerprint: 'a'.repeat(64),
    probe: {},
    idempotencyKey: 'key',
    requestHash: 'b'.repeat(64),
  };
  await service.execute(command);
  await service.execute(command);
  expect(apply).toHaveBeenCalledTimes(1);
});

it('rejects a reused validation key with a different request hash', async () => {
  const receipts = new Map<string, any>();
  const service = new ApplySourceValidationService(
    { execute: (fn) => fn(undefined) },
    {
      applyValidatedLocator: vi.fn().mockResolvedValue({
        id: 'source',
        health: 'LOCATED',
        fingerprint: 'a'.repeat(64),
      }),
    } as never,
    {
      findByKey: async (key) => receipts.get(key) ?? null,
      createPending: async (key, requestHash) => {
        receipts.set(key, { requestHash, response: null });
      },
      complete: async (key, requestHash, response) => {
        receipts.set(key, { requestHash, response });
        return response;
      },
    },
  );
  const base = {
    sourceAssetId: 'source',
    kind: 'LOCAL_FILE' as const,
    resolvedPath: '/tmp/video.mp4',
    sizeBytes: 1n,
    modifiedAt: '2026-07-11T00:00:00Z',
    fingerprint: 'a'.repeat(64),
    probe: {},
    idempotencyKey: 'key',
    requestHash: 'b'.repeat(64),
  };
  await service.execute(base);
  await expect(
    service.execute({ ...base, requestHash: 'c'.repeat(64) }),
  ).rejects.toThrow('idempotency conflict');
});
