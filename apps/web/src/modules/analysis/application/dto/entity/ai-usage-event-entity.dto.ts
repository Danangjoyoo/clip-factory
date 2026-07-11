export interface AIUsageEventEntityDto {
  id: string;
  projectId: string;
  analysisRunId: string;
  clipId?: string | null;
  reservationCallId?: string | null;
  reservationProjectId?: string | null;
  reservationAnalysisRunId?: string | null;
  providerResponseId: string;
  requestHash: string;
  purpose: string;
  modelId: string;
  reasoning: string;
  promptVersion: string;
  schemaVersion: string;
  pricingVersion: string;
  totalInputTokens: bigint;
  cachedInputTokens: bigint;
  cacheWriteInputTokens: bigint;
  outputTokens: bigint;
  reasoningTokens: bigint;
  pricingTier: string;
  costMicrousd: bigint;
  occurredAt: Date;
  responseObjectReference?: {
    bucket: string;
    key: string;
    versionId?: string | null;
    sha256: string;
  } | null;
}
