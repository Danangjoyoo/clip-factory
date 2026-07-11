import { expect, it, vi } from 'vitest';
import { ApplySourceValidationService } from './apply-source-validation.service';
it('replays the same validation receipt without writing twice', async () => {
  const apply = vi.fn().mockResolvedValue({ id: 'source', health: 'LOCATED', fingerprint: 'a'.repeat(64) });
  const service = new ApplySourceValidationService({ applyValidatedLocator: apply } as never);
  const command = { sourceAssetId: 'source', kind: 'LOCAL_FILE' as const, resolvedPath: '/tmp/video.mp4', sizeBytes: 1n, modifiedAt: '2026-07-11T00:00:00Z', fingerprint: 'a'.repeat(64), probe: {}, idempotencyKey: 'key', requestHash: 'b'.repeat(64) };
  await service.execute(command);
  await service.execute(command);
  expect(apply).toHaveBeenCalledTimes(1);
});
