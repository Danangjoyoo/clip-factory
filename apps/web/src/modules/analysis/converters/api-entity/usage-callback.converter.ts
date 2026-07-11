import type { UsageCallbackApiDto } from '../../delivery/http/dto/api/usage-callback-api.dto';
export const usageCallbackApiToEntity = (
  api: UsageCallbackApiDto,
  analysisRunId: string,
) => ({
  ...api,
  analysisRunId,
  totalInputTokens: BigInt(api.inputTokens),
  cachedInputTokens: BigInt(api.cachedInputTokens ?? 0),
  cacheWriteInputTokens: BigInt(api.cacheWriteInputTokens ?? 0),
  outputTokens: BigInt(api.outputTokens),
  reasoningTokens: BigInt(api.reasoningTokens ?? 0),
  occurredAt: new Date(api.occurredAt),
});
