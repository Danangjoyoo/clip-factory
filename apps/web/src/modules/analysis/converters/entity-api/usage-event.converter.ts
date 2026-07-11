import type { AIUsageEventEntityDto } from '../../application/dto/entity';
import type { UsageEventApiDto } from '../../delivery/http/dto/api/usage-event-api.dto';

export const usageEventEntityToApi = (
  event: AIUsageEventEntityDto,
): UsageEventApiDto => ({
  id: event.id,
  projectId: event.projectId,
  analysisRunId: event.analysisRunId,
  clipId: event.clipId ?? null,
  reservationCallId: event.reservationCallId ?? null,
  reservationProjectId: event.reservationProjectId ?? null,
  reservationAnalysisRunId: event.reservationAnalysisRunId ?? null,
  providerResponseId: event.providerResponseId,
  requestHash: event.requestHash,
  purpose: event.purpose,
  modelId: event.modelId,
  reasoning: event.reasoning,
  promptVersion: event.promptVersion,
  schemaVersion: event.schemaVersion,
  pricingVersion: event.pricingVersion,
  inputTokens: event.totalInputTokens.toString(),
  cachedInputTokens: event.cachedInputTokens.toString(),
  cacheWriteInputTokens: event.cacheWriteInputTokens.toString(),
  outputTokens: event.outputTokens.toString(),
  reasoningTokens: event.reasoningTokens.toString(),
  pricingTier: event.pricingTier,
  costMicrousd: event.costMicrousd.toString(),
  occurredAt: event.occurredAt.toISOString(),
  responseObjectReference: event.responseObjectReference ?? null,
});
