import type { ApplyWorkerResultResponse } from '../dto/entity';
import type { IdempotencyReceiptRepository } from '../ports/idempotency-receipt.repository';
import type { JobTransaction } from '../ports/unit-of-work.port';
export class IdempotencyReceiptDataService {
  constructor(private readonly repository: IdempotencyReceiptRepository) {}
  findByKey(key: string, tx?: JobTransaction) {
    return this.repository.findByKey(key, tx);
  }
  createPending(key: string, hash: string, tx?: JobTransaction) {
    return this.repository.createPending(key, hash, tx);
  }
  complete(
    key: string,
    response: ApplyWorkerResultResponse,
    tx?: JobTransaction,
  ) {
    return this.repository.complete(key, response, tx);
  }
}
