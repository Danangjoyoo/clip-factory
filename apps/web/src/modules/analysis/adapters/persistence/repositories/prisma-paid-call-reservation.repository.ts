import { prisma } from '../../../../../infrastructure/prisma/client';
import type { PaidCallReservationRepository } from '../../../application/ports/paid-call-reservation.repository';
import type { AnalysisTransaction } from '../../../application/ports/unit-of-work.port';
import type { PaidCallReservationEntity } from '../../../application/ports/paid-call-reservation.repository';
export class PrismaPaidCallReservationRepository implements PaidCallReservationRepository {
  async lockByCallId(callId: string, tx?: AnalysisTransaction): Promise<PaidCallReservationEntity | null> {
    const row = await (tx ?? prisma).paidCallReservation.findUnique({ where: { callId } });
    return row ? { id: row.id, projectId: row.projectId, analysisRunId: row.analysisRunId, callId: row.callId, requestHash: row.requestHash, worstCaseMicrousd: row.worstCaseMicrousd, providerResponseId: row.providerResponseId, usageEventId: row.usageEventId, status: row.status } : null;
  }
  async complete(
    input: Parameters<PaidCallReservationRepository['complete']>[0],
    tx?: AnalysisTransaction,
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
