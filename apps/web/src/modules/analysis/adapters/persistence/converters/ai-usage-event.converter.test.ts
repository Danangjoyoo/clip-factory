import { describe, expect, it } from 'vitest';
import { aiUsageEventEntityToRecord, aiUsageEventRecordToEntity } from './ai-usage-event.converter';

describe('AI usage persistence converter', () => {
  it('maps bigint entity tokens to Prisma-safe numeric records', () => {
    const entity = {
      id: 'event-1', projectId: 'project-1', analysisRunId: 'run-1', clipId: null,
      providerResponseId: 'response-1', requestHash: 'hash', purpose: 'highlight',
      modelId: 'model', reasoning: 'high', promptVersion: 'prompt', schemaVersion: 'schema',
      pricingVersion: 'price', totalInputTokens: 10n, cachedInputTokens: 2n,
      cacheWriteInputTokens: 0n, outputTokens: 4n, reasoningTokens: 1n,
      pricingTier: 'standard', costMicrousd: 12n, occurredAt: new Date('2026-07-11T00:00:00Z'),
    } as const;
    const record = aiUsageEventEntityToRecord(entity);
    expect(record.inputTokens).toBe(10);
    expect(aiUsageEventRecordToEntity({ id: 'event-1', ...record }).totalInputTokens).toBe(10n);
  });
});
