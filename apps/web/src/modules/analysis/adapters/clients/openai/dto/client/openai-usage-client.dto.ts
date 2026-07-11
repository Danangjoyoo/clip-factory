export interface OpenAIUsageClientDto {
  id: string;
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
}
