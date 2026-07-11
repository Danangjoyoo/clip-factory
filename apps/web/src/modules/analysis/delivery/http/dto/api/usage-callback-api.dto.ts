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
  clipId?: string | null;
  responseObjectReference?: {
    bucket: string;
    key: string;
    versionId?: string | null;
    sha256: string;
  } | null;
}
