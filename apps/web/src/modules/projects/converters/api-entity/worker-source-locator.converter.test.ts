import { expect, it } from 'vitest';
import { workerSourceLocatorEntityToApi } from './worker-source-locator.converter';
it('preserves only the closed locator union', () => {
  expect(
    workerSourceLocatorEntityToApi({
      kind: 'LOCAL_FILE',
      candidatePath: '/tmp/video.mp4',
    }),
  ).toEqual({ kind: 'LOCAL_FILE', candidatePath: '/tmp/video.mp4' });
});
