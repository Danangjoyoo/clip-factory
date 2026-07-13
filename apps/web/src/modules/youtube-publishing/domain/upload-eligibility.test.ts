import { expect, it } from 'vitest';

import { assertYouTubeShortsEligible } from './upload-eligibility';

it('requires completed 9:16 render no longer than 180 seconds', () => {
  expect(() =>
    assertYouTubeShortsEligible({
      status: 'COMPLETED',
      width: 1080,
      height: 1920,
      durationMs: 180_000,
    }),
  ).not.toThrow();
  expect(() =>
    assertYouTubeShortsEligible({
      status: 'FAILED',
      width: 1080,
      height: 1920,
      durationMs: 60_000,
    }),
  ).toThrow('render is not completed');
  expect(() =>
    assertYouTubeShortsEligible({
      status: 'COMPLETED',
      width: 1920,
      height: 1080,
      durationMs: 60_000,
    }),
  ).toThrow('render must be 9:16');
  expect(() =>
    assertYouTubeShortsEligible({
      status: 'COMPLETED',
      width: 1080,
      height: 1920,
      durationMs: 180_001,
    }),
  ).toThrow('render exceeds 180 seconds');
});
