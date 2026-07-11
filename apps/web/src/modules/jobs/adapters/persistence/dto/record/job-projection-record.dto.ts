export interface JobProjectionRecordDto {
  id: string;
  projectId: string;
  workflowId: string;
  status: string;
  terminalResultJson: unknown | null;
}
