export type ProcessingState =
  | 'RUNNING'
  | 'AWAITING_BUDGET'
  | 'PAID_CALL_UNCERTAIN'
  | 'AWAITING_REVIEW'
  | 'COMPLETED'
  | 'FAILED';
export type Stage = {
  name: string;
  status: 'complete' | 'running' | 'pending' | 'failed';
  percent?: number;
};
export type ProcessingPresentation = {
  projectId: string;
  state: ProcessingState;
  stage?: string;
  percent?: number;
  eta: string | null;
  stages: Stage[];
  workerOnline: boolean;
  logs: string[];
  analysisVersion: string;
  analysisId: string;
  possibleSpend?: string;
};
