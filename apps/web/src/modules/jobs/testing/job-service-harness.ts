import { ApplyWorkerResultService } from '../application/services/apply-worker-result.service';
import { IdempotencyReceiptDataService } from '../application/data-services/idempotency-receipt.data-service';
import { JobProjectionDataService } from '../application/data-services/job-projection.data-service';
export function makeJobServiceHarness() {
  const receipts = new Map<string, any>();
  const projects = { terminalMutationCount: 0 };
  const receiptData = new IdempotencyReceiptDataService({
    findByKey: async (key) => receipts.get(key) ?? null,
    createPending: async (key, requestHash) => {
      receipts.set(key, {
        key,
        requestHash,
        status: 'PENDING',
        response: null,
      });
    },
    complete: async (key, response) => {
      const r = receipts.get(key);
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
  );
  return { service, projects };
}
