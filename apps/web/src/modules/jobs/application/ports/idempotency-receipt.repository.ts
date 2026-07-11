import type {
  IdempotencyReceiptEntityDto,
  ApplyWorkerResultResponse,
} from '../dto/entity';
import type { JobTransaction } from './unit-of-work.port';
export interface IdempotencyReceiptRepository {
  findByKey(
    key: string,
    tx?: JobTransaction,
  ): Promise<IdempotencyReceiptEntityDto | null>;
  createPending(
    key: string,
    requestHash: string,
    tx?: JobTransaction,
  ): Promise<void>;
  complete(
    key: string,
    response: ApplyWorkerResultResponse,
    tx?: JobTransaction,
  ): Promise<ApplyWorkerResultResponse>;
}
