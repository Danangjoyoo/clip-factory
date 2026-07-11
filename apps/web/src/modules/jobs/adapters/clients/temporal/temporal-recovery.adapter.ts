import type { WorkflowRecoveryPort } from '../../../application/services/reconcile-workflow.service';
export class TemporalRecoveryAdapter implements WorkflowRecoveryPort {
  constructor(
    private readonly client: { signalWithStart(id: string): Promise<void> },
  ) {}
  reconcile(workflowId: string) {
    return this.client.signalWithStart(workflowId);
  }
}
