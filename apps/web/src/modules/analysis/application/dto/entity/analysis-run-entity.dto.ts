export type AnalysisRunStatus =
  | 'PLANNED'
  | 'VERIFYING_BUDGET'
  | 'AWAITING_BUDGET'
  | 'RUNNING'
  | 'PAID_CALL_UNCERTAIN'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export interface AnalysisRunEntityDto {
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
  status: AnalysisRunStatus;
  createdAt: Date;
  updatedAt: Date;
}
