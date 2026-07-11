export interface WorkflowRecoveryPort {
  reconcile(workflowId: string): Promise<void>;
}
export class ReconcileWorkflowService {
  constructor(private readonly workflows: WorkflowRecoveryPort) {}
  execute(workflowId: string) {
    return this.workflows.reconcile(workflowId);
  }
}
