import { expect, it, vi } from 'vitest';
import { GetWorkerSourceLocatorService } from './get-worker-source-locator.service';
it('returns the pending local path without exposing persistence fields', async () => {
  const service = new GetWorkerSourceLocatorService({ findById: vi.fn().mockResolvedValue({ kind: 'LOCAL_FILE', displayPath: '/tmp/video.mp4', resolvedPath: null }) } as never);
  await expect(service.execute('source')).resolves.toEqual({ kind: 'LOCAL_FILE', candidatePath: '/tmp/video.mp4' });
});
