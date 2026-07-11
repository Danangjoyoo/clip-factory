export interface UsageCallbackApiDto {
  callId: string;
  projectId: string;
  providerResponseId: string;
  requestHash: string;
  modelId: string;
  reasoning: string;
  promptVersion: string;
  schemaVersion: string;
  pricingVersion: string;
  purpose: string;
  inputTokens: number;
  cachedInputTokens?: number;
  cacheWriteInputTokens?: number;
  outputTokens: number;
  reasoningTokens?: number;
  pricingTier: string;
  occurredAt: string;
}
