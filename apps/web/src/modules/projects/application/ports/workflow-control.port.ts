export interface WorkflowControlPort {
  cancel(workflowId: string): Promise<void>;
  signal?(workflowId: string, signal: string): Promise<void>;
}
