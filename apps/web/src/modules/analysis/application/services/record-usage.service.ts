import {
  getPricing,
  normalizeProviderUsage,
  priceTokens,
} from '@clip-factory/config';
import type { AIUsageEventEntityDto } from '../dto/entity';
import { AIUsageEventDataService } from '../data-services/ai-usage-event.data-service';
import { AnalysisRunDataService } from '../data-services/analysis-run.data-service';
import { PaidCallReservationDataService } from '../data-services/paid-call-reservation.data-service';
import type { AnalysisUnitOfWork } from '../ports/unit-of-work.port';

export type UsageEntityInput = Omit<
  AIUsageEventEntityDto,
  'id' | 'costMicrousd'
> & { callId: string; uncertainReservedMicrousd?: bigint };
export class AnalysisError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
const same = (e: AIUsageEventEntityDto, i: UsageEntityInput, cost: bigint) =>
  e.projectId === i.projectId &&
  e.analysisRunId === i.analysisRunId &&
  (e.clipId ?? null) === (i.clipId ?? null) &&
  e.reservationCallId === i.callId &&
  (e.reservationProjectId ?? i.projectId) ===
    (i.reservationProjectId ?? i.projectId) &&
  (e.reservationAnalysisRunId ?? i.analysisRunId) ===
    (i.reservationAnalysisRunId ?? i.analysisRunId) &&
  e.providerResponseId === i.providerResponseId &&
  e.requestHash === i.requestHash &&
  e.purpose === i.purpose &&
  e.modelId === i.modelId &&
  e.reasoning === i.reasoning &&
  e.promptVersion === i.promptVersion &&
  e.schemaVersion === i.schemaVersion &&
  e.pricingVersion === i.pricingVersion &&
  e.totalInputTokens === i.totalInputTokens &&
  e.cachedInputTokens === i.cachedInputTokens &&
  e.cacheWriteInputTokens === i.cacheWriteInputTokens &&
  e.outputTokens === i.outputTokens &&
  e.reasoningTokens === i.reasoningTokens &&
  e.pricingTier === i.pricingTier &&
  e.costMicrousd === cost &&
  e.occurredAt.toISOString() === i.occurredAt.toISOString() &&
  JSON.stringify(e.responseObjectReference ?? null) ===
    JSON.stringify(i.responseObjectReference ?? null);
export class RecordUsageService {
  constructor(
    private readonly unitOfWork: AnalysisUnitOfWork,
    private readonly usage: AIUsageEventDataService,
    private readonly runs: AnalysisRunDataService,
    private readonly reservations: PaidCallReservationDataService,
  ) {}
  execute(input: UsageEntityInput): Promise<AIUsageEventEntityDto> {
    return this.unitOfWork.execute(async (tx) => {
      const reservation = await this.reservations.lockByCallId(
        input.callId,
        tx,
      );
      if (
        !reservation ||
        reservation.projectId !== input.projectId ||
        reservation.analysisRunId !== input.analysisRunId ||
        reservation.requestHash !== input.requestHash
      )
        throw new AnalysisError('RESERVATION_OWNERSHIP_CONFLICT');
      if (
        reservation.status === 'COMPLETED' &&
        reservation.providerResponseId !== input.providerResponseId
      )
        throw new AnalysisError('PAID_CALL_CONFLICT');
      const cost = priceTokens(
        normalizeProviderUsage(
          input.totalInputTokens,
          input.cachedInputTokens,
          input.cacheWriteInputTokens,
          input.outputTokens,
        ),
        getPricing(input.modelId, input.pricingVersion),
      );
      const existing = await this.usage.findByProviderResponseId(
        input.providerResponseId,
        tx,
      );
      if (existing) {
        if (!same(existing, input, cost))
          throw new AnalysisError('PAID_CALL_CONFLICT');
        return existing;
      }
      const event = await this.usage.insert(
        {
          ...input,
          reservationCallId: reservation.callId,
          reservationProjectId: reservation.projectId,
          reservationAnalysisRunId: reservation.analysisRunId,
          costMicrousd: cost,
        },
        tx,
      );
      await this.reservations.complete(
        {
          callId: input.callId,
          projectId: input.projectId,
          analysisRunId: input.analysisRunId,
          requestHash: input.requestHash,
          providerResponseId: input.providerResponseId,
          usageEventId: event.id,
        },
        tx,
      );
      await this.runs.addActualCost(input.analysisRunId, cost, tx);
      if (input.uncertainReservedMicrousd !== undefined)
        await this.runs.reconcileUncertain(
          input.analysisRunId,
          input.uncertainReservedMicrousd,
          tx,
        );
      return event;
    });
  }
}
