export interface WorkflowControlPort {
  cancel(workflowId: string): Promise<void>;
}
