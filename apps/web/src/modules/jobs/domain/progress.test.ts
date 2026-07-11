import { describe, expect, it } from 'vitest';
import { estimateEta, progressBasisPoints } from './progress';
describe('progress', () => {
  it.each([
    [0n, 100n, 0],
    [1n, 3n, 3333],
    [100n, 100n, 10000],
  ])('basis points', (completed, total, expected) =>
    expect(progressBasisPoints(completed, total)).toBe(expected),
  );
  it('rejects invalid work', () =>
    expect(() => progressBasisPoints(2n, 1n)).toThrow('INVALID_WORK_UNITS'));
  it.each(['AWAITING_BUDGET', 'PAID_CALL_UNCERTAIN', 'AWAITING_REVIEW'])(
    'suppresses ETA for %s',
    (state) =>
      expect(
        estimateEta({
          state,
          completed: 10n,
          total: 100n,
          elapsedSeconds: 5,
          historicalThroughputs: [2],
        }),
      ).toEqual({
        lowSeconds: null,
        highSeconds: null,
        confidence: 'NOT_APPLICABLE',
      }),
  );
  it('returns a low-confidence first-run range', () =>
    expect(
      estimateEta({
        state: 'RUNNING',
        completed: 10n,
        total: 100n,
        elapsedSeconds: 5,
        historicalThroughputs: [],
      }),
    ).toEqual({ lowSeconds: 36, highSeconds: 68, confidence: 'LOW' }));
});
