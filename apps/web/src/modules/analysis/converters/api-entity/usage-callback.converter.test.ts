import { describe, expect, it } from 'vitest';
import { usageCallbackApiToEntity } from './usage-callback.converter';

describe('usage callback converter', () => {
  it('maps wire values to immutable usage provenance', () => {
    const result = usageCallbackApiToEntity(
      {
        callId: 'call-1', projectId: 'project-1', providerResponseId: 'response-1',
        requestHash: 'hash', modelId: 'model', reasoning: 'high',
        promptVersion: 'prompt', schemaVersion: 'schema', pricingVersion: 'price',
        purpose: 'highlight', pricingTier: 'standard', inputTokens: 10,
        outputTokens: 4, occurredAt: '2026-07-11T00:00:00.000Z',
      },
      'run-1',
    );
    expect(result.totalInputTokens).toBe(10n);
    expect(result.reservationCallId).toBe('call-1');
    expect(result.reservationAnalysisRunId).toBe('run-1');
  });
});
