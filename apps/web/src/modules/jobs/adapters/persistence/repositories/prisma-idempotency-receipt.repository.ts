import { prisma } from '../../../../../infrastructure/prisma/client';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { IdempotencyReceiptRepository } from '../../../application/ports/idempotency-receipt.repository';
import type { ApplyWorkerResultResponse } from '../../../application/dto/entity';
export class PrismaIdempotencyReceiptRepository implements IdempotencyReceiptRepository {
  async findByKey(key: string, scope: string, tx?: unknown) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    const r = await db.findUnique({ where: { key } });
    if (r && r.scope !== scope) throw new Error('idempotency scope conflict');
    return r
      ? {
          key: r.key,
          requestHash: r.requestHash,
          status: (r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING') as
            | 'COMPLETED'
            | 'PENDING',
          response: r.responseJson as ApplyWorkerResultResponse | null,
        }
      : null;
  }
  async createPending(
    key: string,
    scope: string,
    requestHash: string,
    tx?: unknown,
  ) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    await db.create({
      data: { key, scope, requestHash, status: 'PENDING' },
    });
  }
  async complete(
    key: string,
    scope: string,
    response: ApplyWorkerResultResponse,
    tx?: unknown,
  ) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    const existing = await db.findUnique({ where: { key } });
    if (!existing || existing.scope !== scope)
      throw new Error('idempotency scope conflict');
    await db.update({
      where: { key },
      data: {
        status: 'COMPLETED',
        responseJson: response as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return response;
  }
}
