import type {
  ApplyWorkerResultResponse,
  JobProjectionEntityDto,
} from '../dto/entity';
import type { JobTransaction } from './unit-of-work.port';
export interface JobProjectionRepository {
  findByWorkflowId(
    workflowId: string,
    tx?: JobTransaction,
  ): Promise<JobProjectionEntityDto | null>;
  recordResult(
    workflowId: string,
    result: ApplyWorkerResultResponse,
    tx?: JobTransaction,
  ): Promise<void>;
}
