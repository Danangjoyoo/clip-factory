import { describe, expect, it } from 'vitest';
import { RecordUsageService } from './record-usage.service';
import { AIUsageEventDataService } from '../data-services/ai-usage-event.data-service';
import { AnalysisRunDataService } from '../data-services/analysis-run.data-service';
import { PaidCallReservationDataService } from '../data-services/paid-call-reservation.data-service';

const input = {
  callId: 'call-1', projectId: 'project-1', analysisRunId: 'run-1', clipId: null,
  reservationCallId: 'call-1', reservationProjectId: 'project-1', reservationAnalysisRunId: 'run-1',
  providerResponseId: 'response-2', requestHash: 'hash', purpose: 'highlight', modelId: 'gpt-5.6-sol',
  reasoning: 'high', promptVersion: 'prompt', schemaVersion: 'schema', pricingVersion: 'openai-2026-07-11.1',
  totalInputTokens: 10n, cachedInputTokens: 0n, cacheWriteInputTokens: 0n, outputTokens: 1n,
  reasoningTokens: 0n, pricingTier: 'standard', occurredAt: new Date('2026-07-11T00:00:00Z'),
} as const;

describe('RecordUsageService', () => {
  it('rejects a completed reservation with a different provider response', async () => {
    const service = new RecordUsageService(
      { execute: (fn) => fn(undefined as never) },
      new AIUsageEventDataService({ findByProviderResponseId: async () => null, insert: async () => { throw new Error('not reached'); } }),
      new AnalysisRunDataService({ findById: async () => null, addActualCost: async () => undefined, addUncertain: async () => undefined, reconcileUncertain: async () => undefined }),
      new PaidCallReservationDataService({ lockByCallId: async () => ({ id: 'r', ...input, worstCaseMicrousd: 1n, status: 'COMPLETED', providerResponseId: 'response-1', usageEventId: 'event-1' }), complete: async () => undefined }),
    );
    await expect(service.execute(input)).rejects.toMatchObject({ code: 'PAID_CALL_CONFLICT' });
  });

  it('reconciles an uncertain reservation using its locked worst-case amount', async () => {
    let reconciled: bigint | undefined;
    const service = new RecordUsageService(
      { execute: (fn) => fn(undefined as never) },
      new AIUsageEventDataService({ findByProviderResponseId: async () => null, insert: async (value) => ({ id: 'event', ...value }) as never }),
      new AnalysisRunDataService({ findById: async () => null, addActualCost: async () => undefined, addUncertain: async () => undefined, reconcileUncertain: async (_id, amount) => { reconciled = amount; } }),
      new PaidCallReservationDataService({ lockByCallId: async () => ({ id: 'r', ...input, worstCaseMicrousd: 99n, status: 'UNCERTAIN', providerResponseId: null, usageEventId: null }), complete: async () => undefined }),
    );
    await service.execute(input);
    expect(reconciled).toBe(99n);
  });
});
