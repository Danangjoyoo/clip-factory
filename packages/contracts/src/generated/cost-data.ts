// Generated from Clip Factory contract 1.0.0. Do not edit.

export type CostData = {
  [k: string]: unknown;
} & {
  schemaVersion: '1.0.0';
  analysisRunId: string;
  modelId: 'gpt-5.6-sol' | 'gpt-5.5';
  reasoning: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  pricingVersion: 'openai-2026-07-11.1';
  budgetMicrousd: number;
  reservedMicrousd: number;
  spentMicrousd: number;
  calls: {
    purpose: 'HIGHLIGHT_WINDOW' | 'GLOBAL_RANKING';
    responseId: string;
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    costMicrousd: number;
  }[];
};
