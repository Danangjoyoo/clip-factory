import { describe, expect, it } from 'vitest';
import { UsageCallbackController } from './usage-callback.controller';

describe('usage callback route', () => {
  it('returns JSON-safe usage metadata', async () => {
    const controller = new UsageCallbackController({ execute: async () => ({
      id: 'event', projectId: 'project', analysisRunId: 'run', clipId: null,
      reservationCallId: 'call', reservationProjectId: 'project', reservationAnalysisRunId: 'run',
      providerResponseId: 'response', requestHash: 'hash', purpose: 'highlight', modelId: 'model',
      reasoning: 'high', promptVersion: 'prompt', schemaVersion: 'schema', pricingVersion: 'pricing',
      totalInputTokens: 1n, cachedInputTokens: 0n, cacheWriteInputTokens: 0n,
      outputTokens: 2n, reasoningTokens: 0n, pricingTier: 'standard', costMicrousd: 3n,
      occurredAt: new Date('2026-07-11T00:00:00Z'), responseObjectReference: null,
    }) } as never, 'secret');
    const response = await controller.handle(new Request('http://localhost', {
      method: 'POST', headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
      body: JSON.stringify({ callId: 'call', projectId: 'project', providerResponseId: 'response', requestHash: 'hash', modelId: 'model', reasoning: 'high', promptVersion: 'prompt', schemaVersion: 'schema', pricingVersion: 'pricing', purpose: 'highlight', inputTokens: 1, outputTokens: 2, pricingTier: 'standard', occurredAt: '2026-07-11T00:00:00Z' }),
    }), 'run');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ inputTokens: '1', costMicrousd: '3' });
  });
});
