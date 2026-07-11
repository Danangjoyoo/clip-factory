# Task 16: Persist AI Usage Provenance and Equal-Share Allocations

> **For agentic workers:** Use superpowers:test-driven-development. Usage events are immutable and provider response ID is the paid-call deduplication key.

## Purpose and traceability

Implement design §§13.5, 17, and 19: exact per-call usage/cost metadata, analysis totals, and candidate allocations clearly labeled as estimates.

## Boundaries and files

- Requires Tasks 6, 8, and 15.
- Create: `apps/web/src/modules/analysis/application/dto/entity/analysis-run-entity.dto.ts`
- Create: `apps/web/src/modules/analysis/application/dto/entity/ai-usage-event-entity.dto.ts`
- Create: `apps/web/src/modules/analysis/application/dto/entity/cost-allocation-entity.dto.ts`
- Create: `apps/web/src/modules/analysis/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/analysis/application/ports/ai-usage-event.repository.ts`
- Create: `apps/web/src/modules/analysis/application/ports/cost-allocation.repository.ts`
- Create: `apps/web/src/modules/analysis/application/ports/analysis-run.repository.ts`
- Create: `apps/web/src/modules/analysis/application/ports/paid-call-reservation.repository.ts`
- Create: `apps/web/src/modules/analysis/application/ports/unit-of-work.port.ts`
- Create: `apps/web/src/modules/analysis/application/data-services/ai-usage-event.data-service.ts`
- Create: `apps/web/src/modules/analysis/application/data-services/cost-allocation.data-service.ts`
- Create: `apps/web/src/modules/analysis/application/data-services/analysis-run.data-service.ts`
- Create: `apps/web/src/modules/analysis/application/data-services/paid-call-reservation.data-service.ts`
- Create: `apps/web/src/modules/analysis/application/services/record-usage.service.ts`
- Create: `apps/web/src/modules/analysis/application/services/allocate-shared-cost.service.ts`
- Create: `apps/web/src/modules/analysis/application/services/record-uncertain-paid-call.service.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/dto/record/ai-usage-event-record.dto.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/dto/record/cost-allocation-record.dto.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/dto/record/analysis-run-record.dto.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/dto/record/paid-call-reservation-record.dto.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-ai-usage-event.repository.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-cost-allocation.repository.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-analysis-run.repository.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-paid-call-reservation.repository.ts`
- Create: `apps/web/src/modules/analysis/adapters/clients/openai/dto/client/openai-usage-client.dto.ts`
- Create: `apps/web/src/modules/analysis/delivery/http/dto/api/usage-callback-api.dto.ts`
- Create: `apps/web/src/modules/analysis/delivery/http/usage-callback.controller.ts`
- Create: `apps/web/src/modules/analysis/converters/client-entity/openai-usage.converter.ts`
- Create: `apps/web/src/modules/analysis/converters/api-entity/usage-callback.converter.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/converters/ai-usage-event.converter.ts`
- Create: `apps/web/src/modules/analysis/adapters/persistence/converters/cost-allocation.converter.ts`
- Create: `apps/web/src/modules/analysis/composition/analysis.composition.ts`
- Create: `apps/web/src/app/api/internal/v1/analysis/[analysisRunId]/usage/route.ts`
- Test: `apps/web/src/modules/analysis/application/services/record-usage.service.test.ts`
- Test: `apps/web/src/modules/analysis/domain/equal-share-allocation.test.ts`
- Test: `apps/web/src/modules/analysis/application/services/allocate-shared-cost.service.test.ts`
- Test: `apps/web/src/modules/analysis/application/services/record-uncertain-paid-call.service.test.ts`
- Test: `apps/web/src/modules/analysis/converters/client-entity/openai-usage.converter.test.ts`
- Test: `apps/web/src/modules/analysis/converters/api-entity/usage-callback.converter.test.ts`
- Test: `apps/web/src/modules/analysis/adapters/persistence/converters/ai-usage-event.converter.test.ts`
- Test: `apps/web/src/modules/analysis/adapters/persistence/converters/cost-allocation.converter.test.ts`
- Test: `tests/integration/analysis/usage-persistence.test.ts`
- Provider usage Client enums map explicitly to Entity enums; Prisma records never enter services.

## RED → GREEN → REFACTOR

- [ ] **RED: exact cost and immutable event test.** Seed a reservation owned by `(projectId,analysisRunId,callId,requestHash,worstCaseMicrousd)`. A callback for response `resp_001` with 1M input and 100k output prices to 8,000,000 micro-USD; repeating an identical callback returns the same event; changing any immutable field under the same response ID—project/run/call/request hash, model/reasoning, prompt/schema/pricing version, pricing tier, every input/cache-write/output/reasoning token field, provider response ID, or cost—throws `PAID_CALL_CONFLICT`. A completion whose reservation owner/hash differs throws `RESERVATION_OWNERSHIP_CONFLICT`.

- [ ] Create compile-safe Entity DTOs, Entity-only ports, and a `RecordUsageService.execute` shell returning a zero total, verify `pnpm --filter @clip-factory/web typecheck` passes, then run the test; expect the named immutable-event/allocation assertion to FAIL with no persisted event.

- [ ] **GREEN: create the service.**

```ts
const sameImmutableUsage = (existing: AIUsageEventEntityDto, input: UsageEntityInput): boolean =>
  existing.projectId === input.projectId &&
  existing.analysisRunId === input.analysisRunId &&
  existing.reservationCallId === input.callId &&
  existing.requestHash === input.requestHash &&
  existing.reservationProjectId === input.projectId &&
  existing.reservationAnalysisRunId === input.analysisRunId &&
  existing.providerResponseId === input.providerResponseId &&
  existing.purpose === input.purpose &&
  existing.modelId === input.modelId &&
  existing.reasoning === input.reasoning &&
  existing.promptVersion === input.promptVersion &&
  existing.schemaVersion === input.schemaVersion &&
  existing.pricingVersion === input.pricingVersion &&
  existing.totalInputTokens === input.totalInputTokens &&
  existing.cachedInputTokens === input.cachedInputTokens &&
  existing.cacheWriteInputTokens === input.cacheWriteInputTokens &&
  existing.outputTokens === input.outputTokens &&
  existing.reasoningTokens === input.reasoningTokens &&
  existing.pricingTier === input.pricingTier &&
  existing.costMicrousd === priceTokens(normalizeProviderUsage(input.totalInputTokens, input.cachedInputTokens, input.cacheWriteInputTokens, input.outputTokens), getPricing(input.modelId, input.pricingVersion)) &&
  existing.occurredAt.toISOString() === input.occurredAt.toISOString() &&
  existing.responseObjectReference?.bucket === input.responseObjectReference?.bucket &&
  existing.responseObjectReference?.key === input.responseObjectReference?.key &&
  existing.responseObjectReference?.versionId === input.responseObjectReference?.versionId &&
  existing.responseObjectReference?.sha256 === input.responseObjectReference?.sha256;

export class RecordUsageService {
  constructor(private readonly unitOfWork: UnitOfWork, private readonly usage: AIUsageEventDataService, private readonly runs: AnalysisRunDataService, private readonly reservations: PaidCallReservationDataService) {}
  async execute(input: UsageEntityInput): Promise<AIUsageEventEntityDto> {
    return this.unitOfWork.execute(async (transaction) => {
      const reservation = await this.reservations.lockByCallId(input.callId, transaction);
      if (!reservation || reservation.projectId !== input.projectId || reservation.analysisRunId !== input.analysisRunId || reservation.requestHash !== input.requestHash) throw new AnalysisError('RESERVATION_OWNERSHIP_CONFLICT');
      const existing = await this.usage.findByProviderResponseId(input.providerResponseId, transaction);
      if (existing) {
        if (!sameImmutableUsage(existing, input)) throw new AnalysisError('PAID_CALL_CONFLICT');
        return existing;
      }
      const tokens = normalizeProviderUsage(input.totalInputTokens, input.cachedInputTokens, input.cacheWriteInputTokens, input.outputTokens);
      const costMicrousd = priceTokens(tokens, getPricing(input.modelId, input.pricingVersion));
      const event = await this.usage.create(Object.assign({}, input, { costMicrousd }), transaction);
      await this.reservations.complete({callId:input.callId,projectId:input.projectId,analysisRunId:input.analysisRunId,requestHash:input.requestHash,providerResponseId:input.providerResponseId,usageEventId:event.id}, transaction);
      await this.runs.addActualCost(input.analysisRunId, costMicrousd, transaction);
      return event;
    });
  }
}
```

```ts
it('accepts only a byte-for-byte immutable replay', async () => {
  await expect(h.service.execute(h.input)).resolves.toMatchObject({ providerResponseId: 'resp_001' });
  await expect(h.service.execute(h.input)).resolves.toMatchObject({ providerResponseId: 'resp_001' });
  for (const changed of everyImmutableUsageFieldVariant(h.input)) {
    await expect(h.service.execute(changed)).rejects.toMatchObject({ code: 'PAID_CALL_CONFLICT' });
  }
  await expect(h.service.execute({ ...h.input, callId: OTHER_CALL_ID })).rejects.toMatchObject({ code: 'RESERVATION_OWNERSHIP_CONFLICT' });
  await expect(h.service.execute({ ...h.input, requestHash: 'b'.repeat(64) })).rejects.toMatchObject({ code: 'RESERVATION_OWNERSHIP_CONFLICT' });
});
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/analysis/application/services/record-usage.service.test.ts`; expect PASS. Add a `FailAfterEventInsertUnitOfWork` test that throws between event insertion and reservation completion; assert no event, reservation update, or analysis total survives, then retry and assert one of each. Add converter tests for every immutable field and every token category, all reasoning enum values, pricing tier, UTC timestamp, response ID, purpose, project/run/clip IDs, request hash, reservation ownership, and bigint↔decimal string.

- [ ] **RED: allocation reconciliation test.** Total `10` across ranked clip IDs `[a,b,c]` yields `[4,3,3]`; total `2` yields `[1,1,0]`; zero candidates yields no rows and preserves unallocated analysis cost.

- [ ] **GREEN: create deterministic integer equal-share allocation.**

```ts
export function equalShare(totalMicrousd: bigint, rankedClipIds: readonly string[]) {
  if (totalMicrousd < 0n) throw new AnalysisError('NEGATIVE_COST');
  if (rankedClipIds.length === 0) return [];
  const count = BigInt(rankedClipIds.length);
  const base = totalMicrousd / count;
  const remainder = totalMicrousd % count;
  return rankedClipIds.map((clipId, index) => ({ clipId, method: 'EQUAL_SHARE' as const, amountMicrousd: base + (BigInt(index) < remainder ? 1n : 0n), label: 'allocated estimate', methodLabel: 'equal share' }));
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/analysis/domain/equal-share-allocation.test.ts`; expect PASS and assert sum equals total for 0–20 candidates and totals 0–1000.

- [ ] **RED/GREEN persistence:** write failing repository tests for unique `(analysisRunId,clipId)`, immutable usage update rejection, transaction rollback, and manual-origin prohibition. Add repository methods `insert`, `findByProviderResponseId`, `insertMany` only; do not expose update/delete for usage/allocation.

- [ ] **REFACTOR:** callback controller validates contract/API DTO, calls one service, and returns exact vs allocated labels. Project total equals sum usage events; analysis total equals its events; manual mode endpoints return `0` with empty events.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/analysis
# Expected: PASS
```

- [ ] **RED/GREEN uncertain provenance:** test `RecordUncertainPaidCallService` sets analysis status `PAID_CALL_UNCERTAIN` and increments `uncertainCallCount` plus `uncertainReservedMicrousd` without creating an `AIUsageEvent` or increasing `actualMicrousd`. Its API result labels the value `possible unreported provider charge (worst-case reservation)`. When a response ID/usage later becomes known, reconcile by decrementing the uncertain counters and recording exact actual usage in one transaction.

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/analysis
pnpm exec vitest run tests/integration/analysis/usage-persistence.test.ts
pnpm test:architecture
git diff --check
```

Expected: immutable events deduplicate by response ID, totals reconcile, and candidate allocations are explicitly estimated.

**Suggested commit:** `feat: persist openai usage and cost allocation`
