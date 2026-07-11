import { describe, expect, it } from 'vitest';
import {
  estimatePreflight,
  formatEstimateCopy,
} from './preflight-cost.service';

describe('preflight cost', () => {
  it('estimates full coverage without promising candidates', () => {
    const result = estimatePreflight({
      durationMs: 3_600_000,
      modelId: 'gpt-5.6-sol',
      reasoning: 'high',
      maximumClips: 5,
    });
    expect(result).toMatchObject({
      pricingVersion: 'openai-2026-07-11.1',
      safetyNumerator: 3,
      safetyDenominator: 2,
      fullCoverage: true,
      expectedCandidateRange: { min: 0, max: 5 },
    });
    expect(result.estimateMicrousd).toBeGreaterThan(0n);
    expect(formatEstimateCopy(result)).toContain(
      '0–5 candidates (not guaranteed)',
    );
  });
});
