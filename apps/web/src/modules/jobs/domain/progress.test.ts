import { describe, expect, it } from 'vitest';
import { progressBasisPoints } from './progress';

describe('progressBasisPoints', () => {
  it.each([
    [0n, 100n, 0],
    [1n, 3n, 3333],
    [100n, 100n, 10000],
  ])('calculates measured basis points', (completed, total, expected) =>
    expect(progressBasisPoints(completed, total)).toBe(expected),
  );

  it('rejects invalid work', () =>
    expect(() => progressBasisPoints(2n, 1n)).toThrow('INVALID_WORK_UNITS'));
});
