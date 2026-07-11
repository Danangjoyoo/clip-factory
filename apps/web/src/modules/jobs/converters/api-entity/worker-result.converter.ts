import type { WorkerResultApiDto } from '../../delivery/http/dto/api/worker-result-api.dto';
export const workerResultApiToEntity = (
  api: WorkerResultApiDto,
  workflowId: string,
  idempotencyKey: string,
  requestHash: string,
) => ({
  workflowId,
  projectId: api.projectId,
  status: api.status,
  completedAt: api.completedAt,
  idempotencyKey,
  requestHash,
});
