export interface JobProjectionEntityDto {
  id: string;
  projectId: string;
  workflowId: string;
  status: string;
  terminalResult: ApplyWorkerResultResponse | null;
}
export interface ApplyWorkerResultResponse {
  workflowId: string;
  projectId: string;
  status: string;
  completedAt: string;
}
