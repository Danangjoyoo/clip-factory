import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';

const modelCatalog = JSON.parse(
  await readFile(new URL('../src/model-catalog.json', import.meta.url), 'utf8'),
);
const pricingCatalog = JSON.parse(
  await readFile(
    new URL('../src/pricing-catalog.json', import.meta.url),
    'utf8',
  ),
);
const ruleFor = (modelId) =>
  pricingCatalog.rules.find((rule) => rule.modelId === modelId);
const ceilDiv = (value, divisor) => (value + divisor - 1n) / divisor;
const price = (tokens, rule) => {
  const long =
    tokens.uncachedInput + tokens.cachedInput + tokens.cacheWriteInput >
    BigInt(rule.longContextThresholdTokens);
  const input = long
    ? rule.longContextInputMultiplier
    : { numerator: 1, denominator: 1 };
  const output = long
    ? rule.longContextOutputMultiplier
    : { numerator: 1, denominator: 1 };
  const part = (count, rate, multiplier) =>
    ceilDiv(
      count * BigInt(rate) * BigInt(multiplier.numerator),
      1_000_000n * BigInt(multiplier.denominator),
    );
  return (
    part(tokens.uncachedInput, rule.inputMicrousdPerMillion, input) +
    part(tokens.cachedInput, rule.cachedInputMicrousdPerMillion, input) +
    part(tokens.cacheWriteInput, rule.cacheWriteMicrousdPerMillion, input) +
    part(tokens.output, rule.outputMicrousdPerMillion, output)
  );
};
const serialize = (tokens) =>
  Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [key, value.toString()]),
  );
const rows = [];
for (const [id, tokens] of [
  [
    'one-uncached-token',
    { uncachedInput: 1n, cachedInput: 0n, cacheWriteInput: 0n, output: 0n },
  ],
  [
    'one-cached-token',
    { uncachedInput: 0n, cachedInput: 1n, cacheWriteInput: 0n, output: 0n },
  ],
  [
    'one-cache-write-token',
    { uncachedInput: 0n, cachedInput: 0n, cacheWriteInput: 1n, output: 0n },
  ],
  [
    'threshold-272000',
    {
      uncachedInput: 272000n,
      cachedInput: 0n,
      cacheWriteInput: 0n,
      output: 100000n,
    },
  ],
  [
    'threshold-272001',
    {
      uncachedInput: 272001n,
      cachedInput: 0n,
      cacheWriteInput: 0n,
      output: 100000n,
    },
  ],
  [
    'threshold-272001-zero-output',
    {
      uncachedInput: 272001n,
      cachedInput: 0n,
      cacheWriteInput: 0n,
      output: 0n,
    },
  ],
]) {
  const cost = price(tokens, ruleFor('gpt-5.6-sol'));
  rows.push({
    id,
    tokens: serialize(tokens),
    reasoning: null,
    retries: 0,
    expectedCostMicrousd: cost.toString(),
    expectedReserveMicrousd: ceilDiv(cost * 3n, 2n).toString(),
  });
}
for (const model of modelCatalog.models)
  for (const profile of model.reasoning) {
    const tokens = {
      uncachedInput: 2500n,
      cachedInput: 0n,
      cacheWriteInput: 0n,
      output: BigInt(profile.maxGeneratedTokens),
    };
    const cost = price(tokens, ruleFor(model.id));
    rows.push({
      id: `ceiling-${model.id}-${profile.effort}`,
      modelId: model.id,
      tokens: serialize(tokens),
      reasoning: profile.effort,
      retries: 1,
      expectedCostMicrousd: cost.toString(),
      expectedReserveMicrousd: ceilDiv(cost * 2n * 3n, 2n).toString(),
    });
  }
rows.push({
  id: 'reserve-round-up',
  tokens: {
    uncachedInput: '0',
    cachedInput: '0',
    cacheWriteInput: '0',
    output: '0',
  },
  reasoning: null,
  retries: 0,
  remainingCallCosts: ['101', '200'],
  expectedCostMicrousd: '301',
  expectedReserveMicrousd: '452',
});
rows.sort((a, b) => a.id.localeCompare(b.id));
const fixtureUrl = new URL(
  '../../contracts/test-fixtures/cost-conformance-vectors.json',
  import.meta.url,
);
const content = await format(JSON.stringify(rows, null, 2), {
  parser: 'json',
});
if (process.argv.includes('--check')) {
  const existing = await readFile(fixtureUrl, 'utf8');
  if (existing !== content)
    throw new Error('cost conformance fixture is stale');
} else {
  await writeFile(fixtureUrl, content);
}
