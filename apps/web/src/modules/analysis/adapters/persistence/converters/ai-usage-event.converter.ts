import type { AIUsageEventEntityDto } from '../../../application/dto/entity';
import type { AIUsageEventRecordDto } from '../dto/record/ai-usage-event-record.dto';
type ResponseReference = Exclude<AIUsageEventEntityDto['responseObjectReference'], undefined>;
const responseReference = (value: unknown): ResponseReference => {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  return typeof r.bucket === 'string' && typeof r.key === 'string' && typeof r.sha256 === 'string'
    ? { bucket: r.bucket, key: r.key, sha256: r.sha256, versionId: typeof r.versionId === 'string' ? r.versionId : null }
    : null;
};
export const aiUsageEventRecordToEntity = (
  r: AIUsageEventRecordDto,
): AIUsageEventEntityDto => ({
  id: r.id,
  projectId: r.projectId,
  analysisRunId: r.analysisRunId,
  clipId: r.clipId,
  reservationCallId: r.reservationCallId,
  reservationProjectId: r.reservationProjectId,
  reservationAnalysisRunId: r.reservationAnalysisRunId,
  providerResponseId: r.providerResponseId,
  requestHash: r.requestHash,
  purpose: r.purpose,
  modelId: r.modelId,
  reasoning: r.reasoning,
  promptVersion: r.promptVersion,
  schemaVersion: r.schemaVersion,
  pricingVersion: r.pricingVersion,
  cachedInputTokens: BigInt(r.cachedInputTokens),
  cacheWriteInputTokens: BigInt(r.cacheWriteInputTokens),
  outputTokens: BigInt(r.outputTokens),
  reasoningTokens: BigInt(r.reasoningTokens),
  pricingTier: r.pricingTier,
  costMicrousd: r.costMicrousd,
  occurredAt: r.occurredAt,
  totalInputTokens: BigInt(r.inputTokens),
  responseObjectReference: responseReference(r.responseObjectReference),
});
export const aiUsageEventEntityToRecord = (
  e: Omit<AIUsageEventEntityDto, 'id'>,
): Omit<AIUsageEventRecordDto, 'id'> => ({
  projectId: e.projectId,
  analysisRunId: e.analysisRunId,
  clipId: e.clipId ?? null,
  reservationCallId: e.reservationCallId ?? null,
  reservationProjectId: e.reservationProjectId ?? null,
  reservationAnalysisRunId: e.reservationAnalysisRunId ?? null,
  providerResponseId: e.providerResponseId,
  requestHash: e.requestHash,
  purpose: e.purpose,
  modelId: e.modelId,
  reasoning: e.reasoning,
  promptVersion: e.promptVersion,
  schemaVersion: e.schemaVersion,
  pricingVersion: e.pricingVersion,
  inputTokens: Number(e.totalInputTokens),
  cachedInputTokens: Number(e.cachedInputTokens),
  cacheWriteInputTokens: Number(e.cacheWriteInputTokens),
  outputTokens: Number(e.outputTokens),
  reasoningTokens: Number(e.reasoningTokens),
  pricingTier: e.pricingTier,
  costMicrousd: e.costMicrousd,
  occurredAt: e.occurredAt,
  responseObjectReference: e.responseObjectReference ?? null,
});
