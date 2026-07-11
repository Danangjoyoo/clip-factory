export type TokenCategories = {
  uncachedInput: bigint;
  cachedInput: bigint;
  cacheWriteInput: bigint;
  output: bigint;
};

export type PricingRule = {
  inputMicrousdPerMillion: number;
  cachedInputMicrousdPerMillion: number;
  cacheWriteMicrousdPerMillion: number;
  outputMicrousdPerMillion: number;
  longContextThresholdTokens: number;
  longContextInputMultiplier: { numerator: number; denominator: number };
  longContextOutputMultiplier: { numerator: number; denominator: number };
};

export class CostError extends Error {}
const ceilDiv = (value: bigint, divisor: bigint) =>
  (value + divisor - 1n) / divisor;
const priced = (
  tokens: bigint,
  rate: number,
  multiplier: { numerator: number; denominator: number },
) => {
  if (tokens < 0n) throw new CostError('NEGATIVE_TOKEN_COUNT');
  return ceilDiv(
    tokens * BigInt(rate) * BigInt(multiplier.numerator),
    1_000_000n * BigInt(multiplier.denominator),
  );
};

export function priceTokens(
  tokens: TokenCategories,
  rule: PricingRule,
): bigint {
  const long =
    tokens.output > 0n &&
    tokens.uncachedInput + tokens.cachedInput + tokens.cacheWriteInput >
      BigInt(rule.longContextThresholdTokens);
  const one = { numerator: 1, denominator: 1 } as const;
  const inputMultiplier = long ? rule.longContextInputMultiplier : one;
  const outputMultiplier = long ? rule.longContextOutputMultiplier : one;
  return (
    priced(
      tokens.uncachedInput,
      rule.inputMicrousdPerMillion,
      inputMultiplier,
    ) +
    priced(
      tokens.cachedInput,
      rule.cachedInputMicrousdPerMillion,
      inputMultiplier,
    ) +
    priced(
      tokens.cacheWriteInput,
      rule.cacheWriteMicrousdPerMillion,
      inputMultiplier,
    ) +
    priced(tokens.output, rule.outputMicrousdPerMillion, outputMultiplier)
  );
}

export const quoteCost = priceTokens;

export const requiredReserveMicrousd = (calls: readonly bigint[]) => {
  if (calls.some((cost) => cost < 0n))
    throw new CostError('NEGATIVE_CALL_COST');
  return ceilDiv(calls.reduce((sum, cost) => sum + cost, 0n) * 3n, 2n);
};

export function normalizeProviderUsage(
  totalInput: bigint,
  cachedInput: bigint,
  cacheWriteInput: bigint,
  output: bigint,
): TokenCategories {
  const uncachedInput = totalInput - cachedInput - cacheWriteInput;
  if (
    [totalInput, cachedInput, cacheWriteInput, output, uncachedInput].some(
      (value) => value < 0n,
    )
  )
    throw new CostError('INCONSISTENT_PROVIDER_USAGE');
  return { uncachedInput, cachedInput, cacheWriteInput, output };
}
