import { ApplyWorkerResultService } from '../application/services/apply-worker-result.service';
import { IdempotencyReceiptDataService } from '../application/data-services/idempotency-receipt.data-service';
import { JobProjectionDataService } from '../application/data-services/job-projection.data-service';
export function makeJobServiceHarness() {
  const receipts = new Map<string, any>();
  const projects = { terminalMutationCount: 0 };
  const reservationCalls: string[] = [];
  const receiptData = new IdempotencyReceiptDataService({
    findByKey: async (key, scope) => {
      const receipt = receipts.get(key);
      if (receipt && receipt.scope !== scope)
        throw new Error('idempotency scope conflict');
      return receipt ?? null;
    },
    createPending: async (key, scope, requestHash) => {
      receipts.set(key, {
        key,
        scope,
        requestHash,
        status: 'PENDING',
        response: null,
      });
    },
    complete: async (key, scope, response) => {
      const r = receipts.get(key);
      if (!r || r.scope !== scope)
        throw new Error('idempotency scope conflict');
      Object.assign(r, { status: 'COMPLETED', response });
      return response;
    },
  });
  const jobs = new Map<string, any>();
  const jobData = new JobProjectionDataService({
    findByWorkflowId: async (id) => jobs.get(id) ?? null,
    recordResult: async (id, result) => {
      jobs.set(id, { terminalResult: result });
    },
  });
  const service = new ApplyWorkerResultService(
    { execute: (fn) => fn(undefined) },
    receiptData,
    jobData,
    {
      applyWorkerResult: async (command) => {
        projects.terminalMutationCount++;
        const response = {
          workflowId: command.workflowId,
          projectId: command.projectId,
          status: command.status,
          completedAt: command.completedAt,
        };
        jobs.set(command.workflowId, { terminalResult: response });
        return response;
      },
    },
    {
      authorizeFreshReservation: async (command) => {
        reservationCalls.push(command.workflowId);
      },
    },
  );
  return { service, projects, receipts, reservationCalls };
}
