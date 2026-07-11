import { prisma } from '../../../../../infrastructure/prisma/client';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { SourceValidationReceiptPort } from '../../../application/ports/source-validation-receipt.port';
import type { SourceValidationAcknowledgement } from '../../../application/dto/entity/worker-source-locator-entity.dto';

export class PrismaSourceValidationReceiptRepository implements SourceValidationReceiptPort {
  async findByKey(key: string, tx?: unknown) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    const row = await db.findUnique({ where: { key } });
    if (row && row.scope !== 'source-validation')
      throw new Error('idempotency scope conflict');
    return row
      ? {
          requestHash: row.requestHash,
          response: row.responseJson as SourceValidationAcknowledgement | null,
        }
      : null;
  }

  async createPending(key: string, requestHash: string, tx?: unknown) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    await db.create({
      data: { key, scope: 'source-validation', requestHash, status: 'PENDING' },
    });
  }

  async complete(
    key: string,
    requestHash: string,
    response: SourceValidationAcknowledgement,
    tx?: unknown,
  ) {
    const db =
      (tx as Prisma.TransactionClient | undefined)?.idempotencyReceipt ??
      prisma.idempotencyReceipt;
    const existing = await db.findUnique({ where: { key } });
    if (!existing || existing.scope !== 'source-validation')
      throw new Error('idempotency scope conflict');
    await db.update({
      where: { key },
      data: {
        requestHash,
        status: 'COMPLETED',
        responseJson: response as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return response;
  }
}
