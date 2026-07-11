import { prisma } from '../../../../../infrastructure/prisma/client';
import type { IdempotencyReceiptRepository } from '../../../application/ports/idempotency-receipt.repository';
import type { ApplyWorkerResultResponse } from '../../../application/dto/entity';
export class PrismaIdempotencyReceiptRepository implements IdempotencyReceiptRepository {
  async findByKey(key: string, tx?: any) {
    const r = await (
      tx?.idempotencyReceipt ?? prisma.idempotencyReceipt
    ).findUnique({ where: { key } });
    return r
      ? {
          key: r.key,
          requestHash: r.requestHash,
          status: (r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING') as
            | 'COMPLETED'
            | 'PENDING',
          response: r.responseJson as any,
        }
      : null;
  }
  async createPending(key: string, requestHash: string, tx?: any) {
    await (tx?.idempotencyReceipt ?? prisma.idempotencyReceipt).create({
      data: { key, scope: 'worker-result', requestHash, status: 'PENDING' },
    });
  }
  async complete(key: string, response: ApplyWorkerResultResponse, tx?: any) {
    await (tx?.idempotencyReceipt ?? prisma.idempotencyReceipt).update({
      where: { key },
      data: {
        status: 'COMPLETED',
        responseJson: response,
        completedAt: new Date(),
      },
    });
    return response;
  }
}
