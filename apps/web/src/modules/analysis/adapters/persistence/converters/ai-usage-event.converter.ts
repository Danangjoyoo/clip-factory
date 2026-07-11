import type { AIUsageEventEntityDto } from '../../../application/dto/entity';
import type { AIUsageEventRecordDto } from '../dto/record/ai-usage-event-record.dto';
export const aiUsageEventRecordToEntity = (
  r: AIUsageEventRecordDto,
): AIUsageEventEntityDto => ({
  ...r,
  totalInputTokens: BigInt(r.inputTokens),
  responseObjectReference: null,
});
export const aiUsageEventEntityToRecord = (
  e: Omit<AIUsageEventEntityDto, 'id'>,
): Omit<AIUsageEventRecordDto, 'id'> => ({
  projectId: e.projectId,
  analysisRunId: e.analysisRunId,
  clipId: e.clipId ?? null,
  providerResponseId: e.providerResponseId,
  requestHash: e.requestHash,
  purpose: e.purpose,
  modelId: e.modelId,
  reasoning: e.reasoning,
  promptVersion: e.promptVersion,
  schemaVersion: e.schemaVersion,
  pricingVersion: e.pricingVersion,
  inputTokens: e.totalInputTokens,
  cachedInputTokens: e.cachedInputTokens,
  cacheWriteInputTokens: e.cacheWriteInputTokens,
  outputTokens: e.outputTokens,
  reasoningTokens: e.reasoningTokens,
  pricingTier: e.pricingTier,
  costMicrousd: e.costMicrousd,
  occurredAt: e.occurredAt,
});
