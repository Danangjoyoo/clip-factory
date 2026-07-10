# Task 14: Preflight, Verified Budget Gate, and Paid-Call Reservation

> **For agentic workers:** Use superpowers:test-driven-development. The reservation is a hard prerequisite to the provider adapter in Task 15.

## Purpose and traceability

Implement design §13 and acceptance criterion 7: conservative preflight, actual-input verification, 1.5× remaining-call reserve, explicit user actions, and crash-safe paid-call ownership.

This task's reservation API is also the only path out of `PAID_CALL_UNCERTAIN` after Task 15 reconciliation finds no durable response and the user explicitly acknowledges possible prior spend.

## Boundaries and files

- Requires Tasks 3, 8, 12, and 13.
- Create pure policy in `packages/config/src/cost-policy.ts` with tests; TS application `analysis/application/services/preflight-cost.service.ts` for the New Project API.
- Create `packages/config/scripts/generate-cost-conformance.mjs` and `packages/contracts/test-fixtures/cost-conformance-vectors.json`; both runtime suites consume this same generated golden file and `pnpm test:contracts` rejects a diff.
- Create: `apps/worker/src/clip_factory/domain/cost.py`
- Create: `apps/worker/src/clip_factory/ports/tokenizer.py`
- Create: `apps/worker/src/clip_factory/ports/cost_reservation.py`
- Create: `apps/worker/src/clip_factory/application/verify_budget.py`
- Create: `apps/worker/src/clip_factory/adapters/tokenization/openai_tokenizer.py`
- Create: `apps/worker/src/clip_factory/adapters/http/cost_reservation_adapter.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/analysis_workflow.py`
- Test: `apps/worker/tests/domain/test_cost.py`
- Test: `apps/worker/tests/application/test_verify_budget.py`
- Test: `apps/worker/tests/adapters/tokenization/test_openai_tokenizer.py`
- Test: `apps/worker/tests/adapters/http/test_cost_reservation_adapter.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_analysis_workflow.py`
- Create: `apps/web/src/modules/analysis/application/services/preflight-cost.service.ts`
- Test: `apps/web/src/modules/analysis/application/services/preflight-cost.service.test.ts`
- Modify: `packages/config/package.json`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Modify: `pnpm-lock.yaml`
- Pin `tiktoken==0.13.0`; the adapter records its encoding/version and never changes tokenization silently.
- No floating-point currency; use integer micro-USD and ceiling integer division.

## RED → GREEN → REFACTOR

- [ ] **RED: write official-rate table tests.**

```ts
it.each([
  [{ uncachedInput: 1_000_000n, cachedInput: 0n, cacheWriteInput: 0n, output: 0n }, 5_000_000n],
  [{ uncachedInput: 0n, cachedInput: 1_000_000n, cacheWriteInput: 0n, output: 0n }, 500_000n],
  [{ uncachedInput: 0n, cachedInput: 0n, cacheWriteInput: 1_000_000n, output: 0n }, 6_250_000n],
  [{ uncachedInput: 0n, cachedInput: 0n, cacheWriteInput: 0n, output: 1_000_000n }, 30_000_000n],
  [{ uncachedInput: 272_001n, cachedInput: 0n, cacheWriteInput: 0n, output: 100_000n }, 7_220_010n],
])('prices token categories and long context exactly', (tokens, expected) => {
  expect(priceTokens(tokens, pricingRule)).toBe(expected);
});
it('reserves ceil(1.5 times every remaining worst-case call)', () => {
  expect(requiredReserveMicrousd([101n, 200n])).toBe(452n);
});
```

- [ ] Run `pnpm --filter @clip-factory/config test -- cost-policy.test.ts`; expect import FAIL.

- [ ] **GREEN: create integer formulas.**

```ts
const ceilDiv = (value: bigint, divisor: bigint) => (value + divisor - 1n) / divisor;
const priced = (tokens: bigint, rate: bigint, multiplier: Readonly<{numerator:number;denominator:number}>) =>
  ceilDiv(tokens * rate * BigInt(multiplier.numerator), 1_000_000n * BigInt(multiplier.denominator));
export function priceTokens(tokens: TokenCategories, rule: PricingRule): bigint {
  const long = tokens.uncachedInput + tokens.cachedInput + tokens.cacheWriteInput > BigInt(rule.longContextThresholdTokens);
  const one = {numerator:1,denominator:1} as const;
  const inputMultiplier = long ? rule.longContextInputMultiplier : one;
  const outputMultiplier = long ? rule.longContextOutputMultiplier : one;
  const input = priced(tokens.uncachedInput, rule.inputMicrousdPerMillion, inputMultiplier);
  const cached = priced(tokens.cachedInput, rule.cachedInputMicrousdPerMillion, inputMultiplier);
  const write = priced(tokens.cacheWriteInput, rule.cacheWriteMicrousdPerMillion, inputMultiplier);
  const output = priced(tokens.output, rule.outputMicrousdPerMillion, outputMultiplier);
  return input + cached + write + output;
}
export const requiredReserveMicrousd = (calls: readonly bigint[]) => ceilDiv(calls.reduce((sum, cost) => sum + cost, 0n) * 3n, 2n);
export function normalizeProviderUsage(totalInput: bigint, cachedInput: bigint, cacheWriteInput: bigint, output: bigint): TokenCategories {
  const uncachedInput = totalInput - cachedInput - cacheWriteInput;
  if (totalInput < 0n || cachedInput < 0n || cacheWriteInput < 0n || output < 0n || uncachedInput < 0n) throw new CostError('INCONSISTENT_PROVIDER_USAGE');
  return { uncachedInput, cachedInput, cacheWriteInput, output };
}
```

- [ ] Add `expect(normalizeProviderUsage(1000n, 250n, 100n, 40n)).toEqual({uncachedInput:650n,cachedInput:250n,cacheWriteInput:100n,output:40n})` and assert `(1000,800,300,40)` throws `INCONSISTENT_PROVIDER_USAGE`. Run cost tests; expect PASS.

- [ ] **RED: add shared-vector consumers before the generator.** TypeScript and Python each load `packages/contracts/test-fixtures/cost-conformance-vectors.json`, run every case, and compare decimal-string micro-USD. Required case IDs are `one-uncached-token`, `one-cached-token`, `one-cache-write-token`, `threshold-272000`, `threshold-272001`, `reserve-round-up`, every `ceiling-gpt-5.6-sol-<effort>`, and every `ceiling-gpt-5.5-<effort>` supported by its catalog entry.

- [ ] **GREEN: create an independent vector generator that does not import `cost-policy.ts`.**

```js
// packages/config/scripts/generate-cost-conformance.mjs
import { readFile, writeFile } from 'node:fs/promises';
const modelCatalog = JSON.parse(await readFile(new URL('../src/model-catalog.json',import.meta.url),'utf8'));
const pricingCatalog = JSON.parse(await readFile(new URL('../src/pricing-catalog.json',import.meta.url),'utf8'));
const rule = pricingCatalog.rules[0];
const ceilDiv = (value,divisor) => (value+divisor-1n)/divisor;
const priced = (tokens,rate,multiplier) => ceilDiv(tokens*rate*BigInt(multiplier.numerator),1_000_000n*BigInt(multiplier.denominator));
function referencePrice(tokens, priceRule=rule) {
  const total = tokens.uncachedInput+tokens.cachedInput+tokens.cacheWriteInput;
  const long = total>BigInt(priceRule.longContextThresholdTokens);
  const one={numerator:1,denominator:1};
  const inputMultiplier=long?priceRule.longContextInputMultiplier:one;
  const outputMultiplier=long?priceRule.longContextOutputMultiplier:one;
  return priced(tokens.uncachedInput,BigInt(priceRule.inputMicrousdPerMillion),inputMultiplier)+priced(tokens.cachedInput,BigInt(priceRule.cachedInputMicrousdPerMillion),inputMultiplier)+priced(tokens.cacheWriteInput,BigInt(priceRule.cacheWriteMicrousdPerMillion),inputMultiplier)+priced(tokens.output,BigInt(priceRule.outputMicrousdPerMillion),outputMultiplier);
}
const tokenCases = [
  ['one-uncached-token',{uncachedInput:1n,cachedInput:0n,cacheWriteInput:0n,output:0n}],
  ['one-cached-token',{uncachedInput:0n,cachedInput:1n,cacheWriteInput:0n,output:0n}],
  ['one-cache-write-token',{uncachedInput:0n,cachedInput:0n,cacheWriteInput:1n,output:0n}],
  ['threshold-272000',{uncachedInput:272000n,cachedInput:0n,cacheWriteInput:0n,output:100000n}],
  ['threshold-272001',{uncachedInput:272001n,cachedInput:0n,cacheWriteInput:0n,output:100000n}],
];
const rows = tokenCases.map(([id,tokens]) => ({id,tokens:Object.fromEntries(Object.entries(tokens).map(([key,value])=>[key,value.toString()])),reasoning:null,retries:0,expectedCostMicrousd:referencePrice(tokens).toString(),expectedReserveMicrousd:ceilDiv(referencePrice(tokens)*3n,2n).toString()}));
for (const model of modelCatalog.models) {
  const modelRule=pricingCatalog.rules.find((candidate)=>candidate.modelId===model.id);
  if (!modelRule) throw new Error(`Missing pricing rule for ${model.id}`);
  for (const profile of model.reasoning) {
    const tokens={uncachedInput:2500n,cachedInput:0n,cacheWriteInput:0n,output:BigInt(profile.maxGeneratedTokens)};
    const cost=referencePrice(tokens, modelRule);
    rows.push({id:`ceiling-${model.id}-${profile.effort}`,modelId:model.id,tokens:Object.fromEntries(Object.entries(tokens).map(([key,value])=>[key,value.toString()])),reasoning:profile.effort,retries:1,expectedCostMicrousd:cost.toString(),expectedReserveMicrousd:ceilDiv(cost*2n*3n,2n).toString()});
  }
}
rows.push({id:'reserve-round-up',tokens:{uncachedInput:'0',cachedInput:'0',cacheWriteInput:'0',output:'0'},reasoning:null,retries:0,remainingCallCosts:['101','200'],expectedCostMicrousd:'301',expectedReserveMicrousd:'452'});
rows.sort((left,right)=>left.id.localeCompare(right.id));
await writeFile(new URL('../../contracts/test-fixtures/cost-conformance-vectors.json',import.meta.url),`${JSON.stringify(rows,null,2)}\n`);
```

- [ ] **RED: test preflight assumptions with exact input/output.**

```ts
it('estimates full 60-minute coverage without promising candidates', () => {
  const result=estimatePreflight({durationMs:3_600_000,modelId:'gpt-5.6-sol',reasoning:'high',maximumClips:5});
  expect(result).toMatchObject({pricingVersion:'openai-2026-07-11.1',safetyNumerator:3,safetyDenominator:2,fullCoverage:true,expectedCandidateRange:{min:0,max:5}});
  expect(result.estimateMicrousd).toBeGreaterThan(0n);
  expect(formatEstimateCopy(result)).toContain('0–5 candidates (not guaranteed)');
});
```

- [ ] **GREEN: create the exact preflight function.**

```ts
export function estimatePreflight(input: PreflightInput): PreflightEstimate {
  const durationSeconds = Math.ceil(input.durationMs / 1000);
  const windowCount = Math.max(1, Math.ceil((durationSeconds - 120) / (1200 - 120)));
  const profile = getModel(input.modelId).reasoning.find((item) => item.effort === input.reasoning);
  if (!profile) throw new CostError('UNSUPPORTED_REASONING');
  const transcriptTokens = BigInt(durationSeconds * 3);
  const calls = windowCount + 1;
  const inputPerWindow = (transcriptTokens + BigInt(windowCount) - 1n) / BigInt(windowCount) + 2500n;
  const worst = Array.from({ length: calls * 2 }, (_, index) => priceTokens({ uncachedInput: index % calls === calls - 1 ? transcriptTokens + 2500n : inputPerWindow, cachedInput: 0n, cacheWriteInput: 0n, output: BigInt(profile.maxGeneratedTokens) }, getPricing(input.modelId, 'openai-2026-07-11.1')));
  return { estimateMicrousd: requiredReserveMicrousd(worst), pricingVersion: 'openai-2026-07-11.1', safetyNumerator: 3, safetyDenominator: 2, fullCoverage: true, expectedCandidateRange: { min: 0, max: input.maximumClips } };
}
```

- [ ] **RED: Python verified-gate test.** With remaining budget `451`, remaining calls `[101,200]` returns `AWAITING_BUDGET`; with `452` it reserves each call. Retry reservation is denied when it would exceed the remaining cap.

- [ ] **GREEN: implement the exact decision.**

```python
def verify_remaining_budget(remaining_budget: int, worst_case_calls: Sequence[int]) -> BudgetDecision:
    if remaining_budget < 0 or any(cost < 0 for cost in worst_case_calls):
        raise ValueError("budget and costs must be nonnegative")
    reserve = ((sum(worst_case_calls) * 3) + 1) // 2
    return BudgetDecision(allowed=reserve <= remaining_budget, required_microusd=reserve, remaining_microusd=remaining_budget)
```

`CostReservationPort.reserve(callId, worstCaseMicrousd, idempotencyKey)` calls an internal Next.js endpoint that atomically rejects over-cap or duplicate-different reservations and returns the existing reservation for duplicate-identical input.

- [ ] Run budget tests; expect PASS.

- [ ] **RED: time-skipping tests** assert `AnalysisWorkflow` enters `AWAITING_BUDGET` with no provider activity, accepts only `raise_budget(newCap)`, `choose_coverage(startMs,endMs)`, or `cancel`, and never silently changes model/reasoning/retries.

- [ ] **GREEN: add exact budget signals and wait loop.**

```python
@workflow.signal
def raise_budget(self, new_cap_microusd: int) -> None:
    self._budget_action = BudgetAction("RAISE_CAP", new_cap_microusd, None, None, False)

@workflow.signal
def choose_coverage(self, start_ms: int, end_ms: int) -> None:
    self._budget_action = BudgetAction("CHOOSE_COVERAGE", None, start_ms, end_ms, False)

@workflow.signal
def cancel_analysis(self) -> None:
    self._budget_action = BudgetAction("CANCEL", None, None, None, False)

async def await_budget_action(self, decision: BudgetDecision) -> BudgetAction:
    self._state = "AWAITING_BUDGET"
    self._budget_action = None
    await workflow.wait_condition(lambda: self._budget_action is not None)
    action = cast(BudgetAction, self._budget_action)
    await workflow.execute_activity(persist_budget_action, PersistBudgetActionInput(self._analysis_run_id, decision, action), start_to_close_timeout=timedelta(seconds=30))
    return action
```

The activity tokenizes every exact prompt+transcript input, returns the immutable pricing/profile versions and remaining call costs, then invokes `verify_remaining_budget`. Invalid range/cap makes `persist_budget_action` return a typed rejection and the workflow returns to this loop without changing model, reasoning, or retry count.

- [ ] **REFACTOR:** add boundary tests for exactly 272000/272001 input tokens, every profile's single generated-token ceiling, zero candidates, retry denied/allowed, and micro-USD overflow guards. Assert `reasoning_tokens <= output_tokens` is stored as detail but never added to billed output or the reserve.

## Verification and commit

```bash
pnpm --filter @clip-factory/config test -- cost-policy.test.ts
pnpm test:contracts
pnpm exec vitest run apps/web/src/modules/analysis/application/services/preflight-cost.service.test.ts
uv run --directory apps/worker pytest tests/domain/test_cost.py tests/application/test_verify_budget.py tests/entrypoints/temporal/test_analysis_workflow.py -q
pnpm test:architecture
git diff --check
```

Expected: no paid-call activity can be scheduled until a matching durable reservation fits the remaining cap at 1.5×.

**Suggested commit:** `feat: enforce verified openai job budgets`
