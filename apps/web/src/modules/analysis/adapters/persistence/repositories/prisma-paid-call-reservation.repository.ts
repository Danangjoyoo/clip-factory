import { prisma } from '../../../../../infrastructure/prisma/client';
import type { PaidCallReservationRepository } from '../../../application/ports/paid-call-reservation.repository';
export class PrismaPaidCallReservationRepository implements PaidCallReservationRepository {
  async lockByCallId(callId: string, tx?: any) {
    return (tx ?? prisma).paidCallReservation.findUnique({ where: { callId } });
  }
  async complete(
    input: Parameters<PaidCallReservationRepository['complete']>[0],
    tx?: any,
  ) {
    await (tx ?? prisma).paidCallReservation.update({
      where: { callId: input.callId },
      data: {
        status: 'COMPLETED',
        providerResponseId: input.providerResponseId,
        usageEventId: input.usageEventId,
        completedAt: new Date(),
      },
    });
  }
}
