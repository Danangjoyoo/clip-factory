export interface UsageEventApiDto {
  id: string;
  projectId: string;
  analysisRunId: string;
  clipId: string | null;
  reservationCallId: string | null;
  reservationProjectId: string | null;
  reservationAnalysisRunId: string | null;
  providerResponseId: string;
  requestHash: string;
  purpose: string;
  modelId: string;
  reasoning: string;
  promptVersion: string;
  schemaVersion: string;
  pricingVersion: string;
  inputTokens: string;
  cachedInputTokens: string;
  cacheWriteInputTokens: string;
  outputTokens: string;
  reasoningTokens: string;
  pricingTier: string;
  costMicrousd: string;
  occurredAt: string;
  responseObjectReference: {
    bucket: string;
    key: string;
    versionId?: string | null;
    sha256: string;
  } | null;
}
