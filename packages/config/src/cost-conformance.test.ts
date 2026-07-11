import { describe, expect, it } from 'vitest';
import { priceTokens } from './cost-policy';
import vectors from '../../contracts/test-fixtures/cost-conformance-vectors.json';
import pricingCatalog from './pricing-catalog.json';

const rules = pricingCatalog.rules as Array<Record<string, unknown>>;

describe('shared cost conformance vectors', () => {
  it('matches every generated expected cost', () => {
    for (const vector of vectors) {
      if (!vector.tokens || !vector.expectedCostMicrousd || vector.remainingCallCosts) continue;
      const rule = rules.find((item) => item.modelId === (vector.modelId ?? 'gpt-5.6-sol')) ?? rules[0];
      const tokens = Object.fromEntries(Object.entries(vector.tokens as Record<string, string>).map(([key, value]) => [key, BigInt(value)])) as Parameters<typeof priceTokens>[0];
      expect(priceTokens(tokens, rule as Parameters<typeof priceTokens>[1]).toString(), String(vector.id)).toBe(String(vector.expectedCostMicrousd));
    }
  });
});
