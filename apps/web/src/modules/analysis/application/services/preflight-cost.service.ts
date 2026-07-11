import {
  getModel,
  getPricing,
  priceTokens,
  requiredReserveMicrousd,
  CostError,
} from '@clip-factory/config';

export type PreflightInput = {
  durationMs: number;
  modelId: string;
  reasoning: string;
  maximumClips: number;
};
export type PreflightEstimate = {
  estimateMicrousd: bigint;
  pricingVersion: string;
  safetyNumerator: number;
  safetyDenominator: number;
  fullCoverage: boolean;
  expectedCandidateRange: { min: number; max: number };
};

export function estimatePreflight(input: PreflightInput): PreflightEstimate {
  if (input.durationMs < 0 || input.maximumClips < 0)
    throw new CostError('INVALID_PREFLIGHT_INPUT');
  const durationSeconds = Math.ceil(input.durationMs / 1000);
  const windowCount = Math.max(
    1,
    Math.ceil((durationSeconds - 120) / (1200 - 120)),
  );
  const model = getModel(input.modelId);
  const profile = model.reasoning.find(
    (item) => item.effort === input.reasoning,
  );
  if (!profile) throw new CostError('UNSUPPORTED_REASONING');
  const pricingVersion = 'openai-2026-07-11.1';
  const pricing = getPricing(input.modelId, pricingVersion);
  const transcriptTokens = BigInt(durationSeconds * 3);
  const calls = windowCount + 1;
  const inputPerWindow =
    (transcriptTokens + BigInt(windowCount) - 1n) / BigInt(windowCount) + 2500n;
  const worst = Array.from({ length: calls * 2 }, (_, index) =>
    priceTokens(
      {
        uncachedInput:
          index % calls === calls - 1
            ? transcriptTokens + 2500n
            : inputPerWindow,
        cachedInput: 0n,
        cacheWriteInput: 0n,
        output: BigInt(profile.maxGeneratedTokens),
      },
      pricing,
    ),
  );
  return {
    estimateMicrousd: requiredReserveMicrousd(worst),
    pricingVersion,
    safetyNumerator: 3,
    safetyDenominator: 2,
    fullCoverage: true,
    expectedCandidateRange: { min: 0, max: input.maximumClips },
  };
}

export const formatEstimateCopy = (estimate: PreflightEstimate) =>
  `${estimate.expectedCandidateRange.min}–${estimate.expectedCandidateRange.max} candidates (not guaranteed)`;
