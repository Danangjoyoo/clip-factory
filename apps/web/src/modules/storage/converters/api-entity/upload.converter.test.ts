import { expect, it } from 'vitest';
import { parseSize, sizeToApi } from './upload.converter';
it('round trips decimal bigint sizes', () => {
  expect(parseSize(sizeToApi(12345678901234567890n))).toBe(
    12345678901234567890n,
  );
});
