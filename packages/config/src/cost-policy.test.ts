import { describe, expect, it } from 'vitest';
import {
  normalizeProviderUsage,
  priceTokens,
  requiredReserveMicrousd,
} from './cost-policy';

const rule = {
  inputMicrousdPerMillion: 5_000_000,
  cachedInputMicrousdPerMillion: 500_000,
  cacheWriteMicrousdPerMillion: 6_250_000,
  outputMicrousdPerMillion: 30_000_000,
  longContextThresholdTokens: 272_000,
  longContextInputMultiplier: { numerator: 2, denominator: 1 },
  longContextOutputMultiplier: { numerator: 3, denominator: 2 },
};
describe('cost policy', () => {
  it.each([
    [
      {
        uncachedInput: 1_000_000n,
        cachedInput: 0n,
        cacheWriteInput: 0n,
        output: 0n,
      },
      10_000_000n,
    ],
    [
      {
        uncachedInput: 0n,
        cachedInput: 1_000_000n,
        cacheWriteInput: 0n,
        output: 0n,
      },
      1_000_000n,
    ],
    [
      {
        uncachedInput: 0n,
        cachedInput: 0n,
        cacheWriteInput: 1_000_000n,
        output: 0n,
      },
      12_500_000n,
    ],
    [
      {
        uncachedInput: 0n,
        cachedInput: 0n,
        cacheWriteInput: 0n,
        output: 1_000_000n,
      },
      30_000_000n,
    ],
    [
      {
        uncachedInput: 272_001n,
        cachedInput: 0n,
        cacheWriteInput: 0n,
        output: 0n,
      },
      2_720_010n,
    ],
  ])('prices token categories', (tokens, expected) =>
    expect(priceTokens(tokens, rule)).toBe(expected),
  );
  it('reserves with ceiling', () =>
    expect(requiredReserveMicrousd([101n, 200n])).toBe(452n));
  it('normalizes provider usage', () =>
    expect(normalizeProviderUsage(1000n, 250n, 100n, 40n)).toEqual({
      uncachedInput: 650n,
      cachedInput: 250n,
      cacheWriteInput: 100n,
      output: 40n,
    }));
  it('rejects inconsistent usage', () =>
    expect(() => normalizeProviderUsage(1000n, 800n, 300n, 40n)).toThrow(
      'INCONSISTENT_PROVIDER_USAGE',
    ));
});
