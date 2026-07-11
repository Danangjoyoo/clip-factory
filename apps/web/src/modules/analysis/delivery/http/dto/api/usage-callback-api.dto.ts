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
  inputTokens: string;
  cachedInputTokens?: string;
  cacheWriteInputTokens?: string;
  outputTokens: string;
  reasoningTokens?: string;
  pricingTier: string;
  occurredAt: string;
  clipId?: string | null;
  responseObjectReference?: {
    bucket: string;
    key: string;
    versionId?: string | null;
    sha256: string;
  } | null;
}
