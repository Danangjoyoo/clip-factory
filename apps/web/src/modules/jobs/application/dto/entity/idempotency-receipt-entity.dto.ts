import type { ApplyWorkerResultResponse } from './job-projection-entity.dto';
export interface IdempotencyReceiptEntityDto {
  key: string;
  requestHash: string;
  status: 'PENDING' | 'COMPLETED';
  response: ApplyWorkerResultResponse | null;
}
