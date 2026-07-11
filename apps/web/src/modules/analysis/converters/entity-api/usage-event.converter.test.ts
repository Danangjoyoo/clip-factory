import { describe, expect, it } from 'vitest';
import { usageEventEntityToApi } from './usage-event.converter';

describe('usage event API converter', () => {
  it('serializes bigint accounting fields as decimal strings', () => {
    const result = usageEventEntityToApi({
      id: 'event', projectId: 'project', analysisRunId: 'run', clipId: null,
      reservationCallId: 'call', reservationProjectId: 'project', reservationAnalysisRunId: 'run',
      providerResponseId: 'response', requestHash: 'hash', purpose: 'highlight', modelId: 'model',
      reasoning: 'high', promptVersion: 'prompt', schemaVersion: 'schema', pricingVersion: 'pricing',
      totalInputTokens: 9007199254740993n, cachedInputTokens: 2n, cacheWriteInputTokens: 3n,
      outputTokens: 4n, reasoningTokens: 5n, pricingTier: 'standard', costMicrousd: 6n,
      occurredAt: new Date('2026-07-11T00:00:00Z'), responseObjectReference: null,
    });
    expect(result.inputTokens).toBe('9007199254740993');
    expect(result.costMicrousd).toBe('6');
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
