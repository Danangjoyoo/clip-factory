import { prisma } from '../../../../../infrastructure/prisma/client';
import type { SourceValidationReceiptPort } from '../../../application/ports/source-validation-receipt.port';
import type { SourceValidationAcknowledgement } from '../../../application/dto/entity/worker-source-locator-entity.dto';

export class PrismaSourceValidationReceiptRepository implements SourceValidationReceiptPort {
  async findByKey(key: string, tx?: any) {
    const row = await (
      tx?.idempotencyReceipt ?? prisma.idempotencyReceipt
    ).findUnique({ where: { key } });
    return row
      ? {
          requestHash: row.requestHash,
          response: row.responseJson as SourceValidationAcknowledgement | null,
        }
      : null;
  }

  async createPending(key: string, requestHash: string, tx?: any) {
    await (tx?.idempotencyReceipt ?? prisma.idempotencyReceipt).create({
      data: { key, scope: 'source-validation', requestHash, status: 'PENDING' },
    });
  }

  async complete(
    key: string,
    requestHash: string,
    response: SourceValidationAcknowledgement,
    tx?: any,
  ) {
    await (tx?.idempotencyReceipt ?? prisma.idempotencyReceipt).update({
      where: { key },
      data: {
        requestHash,
        status: 'COMPLETED',
        responseJson: response,
        completedAt: new Date(),
      },
    });
    return response;
  }
}
