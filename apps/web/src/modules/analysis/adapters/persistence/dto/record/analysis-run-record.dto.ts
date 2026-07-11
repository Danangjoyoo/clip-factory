export type AnalysisRunRecordDto = {
  id: string;
  projectId: string;
  modelId: string;
  reasoning: string;
  promptVersion: string;
  schemaVersion: string;
  pricingVersion: string;
  budgetMicrousd: bigint;
  estimatedMaxMicrousd: bigint;
  actualMicrousd: bigint;
  uncertainCallCount: number;
  uncertainReservedMicrousd: bigint;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
