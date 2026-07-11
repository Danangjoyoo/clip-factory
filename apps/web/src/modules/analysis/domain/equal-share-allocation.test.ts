import { describe, expect, it } from 'vitest';
import { equalShare } from './equal-share-allocation';

describe('equalShare', () => {
  it('distributes remainder in rank order', () => {
    expect(
      equalShare(10n, ['a', 'b', 'c']).map((x) => x.amountMicrousd),
    ).toEqual([4n, 3n, 3n]);
    expect(
      equalShare(2n, ['a', 'b', 'c']).map((x) => x.amountMicrousd),
    ).toEqual([1n, 1n, 0n]);
  });
  it('conserves every non-negative total', () => {
    for (let n = 0; n <= 20; n++)
      for (let total = 0; total <= 1000; total++) {
        const rows = equalShare(
          BigInt(total),
          Array.from({ length: n }, (_, i) => String(i)),
        );
        if (n > 0)
          expect(rows.reduce((sum, row) => sum + row.amountMicrousd, 0n)).toBe(
            BigInt(total),
          );
      }
  });
});
