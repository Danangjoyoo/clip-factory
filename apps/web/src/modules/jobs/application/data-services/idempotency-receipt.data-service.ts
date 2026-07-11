import type { ApplyWorkerResultResponse } from '../dto/entity';
import type { IdempotencyReceiptRepository } from '../ports/idempotency-receipt.repository';
import type { JobTransaction } from '../ports/unit-of-work.port';
export class IdempotencyReceiptDataService {
  constructor(private readonly repository: IdempotencyReceiptRepository) {}
  findByKey(key: string, scope: string, tx?: JobTransaction) {
    return this.repository.findByKey(key, scope, tx);
  }
  createPending(key: string, scope: string, hash: string, tx?: JobTransaction) {
    return this.repository.createPending(key, scope, hash, tx);
  }
  complete(
    key: string,
    scope: string,
    response: ApplyWorkerResultResponse,
    tx?: JobTransaction,
  ) {
    return this.repository.complete(key, scope, response, tx);
  }
}
