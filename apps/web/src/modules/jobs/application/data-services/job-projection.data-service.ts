import type { ApplyWorkerResultResponse } from '../dto/entity';
import type { JobProjectionRepository } from '../ports/job-projection.repository';
import type { JobTransaction } from '../ports/unit-of-work.port';
export class JobProjectionDataService {
  constructor(private readonly repository: JobProjectionRepository) {}
  findByWorkflowId(id: string, tx?: JobTransaction) {
    return this.repository.findByWorkflowId(id, tx);
  }
  recordResult(
    id: string,
    result: ApplyWorkerResultResponse,
    tx?: JobTransaction,
  ) {
    return this.repository.recordResult(id, result, tx);
  }
}
