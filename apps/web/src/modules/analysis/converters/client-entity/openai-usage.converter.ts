import type { OpenAIUsageClientDto } from '../../adapters/clients/openai/dto/client/openai-usage-client.dto';
export const openAIUsageToTokens = (usage: OpenAIUsageClientDto) => ({
  providerResponseId: usage.id,
  totalInputTokens: BigInt(usage.input_tokens),
  cachedInputTokens: BigInt(usage.input_tokens_details?.cached_tokens ?? 0),
  cacheWriteInputTokens: 0n,
  outputTokens: BigInt(usage.output_tokens),
  reasoningTokens: BigInt(usage.output_tokens_details?.reasoning_tokens ?? 0),
});
