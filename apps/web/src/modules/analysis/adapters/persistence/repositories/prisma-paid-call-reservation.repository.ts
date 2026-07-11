import { prisma } from '../../../../../infrastructure/prisma/client';
import { Prisma } from '../../../../../generated/prisma/client';
import type { PaidCallReservationRepository } from '../../../application/ports/paid-call-reservation.repository';
import type { AnalysisTransaction } from '../../../application/ports/unit-of-work.port';
import type { PaidCallReservationEntity } from '../../../application/ports/paid-call-reservation.repository';
export class PrismaPaidCallReservationRepository implements PaidCallReservationRepository {
  async lockByCallId(callId: string, tx?: AnalysisTransaction): Promise<PaidCallReservationEntity | null> {
    const row = tx
      ? (await tx.$queryRaw<Array<{
          id: string;
          project_id: string;
          analysis_run_id: string;
          call_id: string;
          request_hash: string;
          worst_case_microusd: bigint;
          provider_response_id: string | null;
          usage_event_id: string | null;
          status: string;
        }>>(Prisma.sql`SELECT id, project_id, analysis_run_id, call_id, request_hash, worst_case_microusd, provider_response_id, usage_event_id, status FROM paid_call_reservations WHERE call_id = ${callId} FOR UPDATE`))[0]
      : await prisma.paidCallReservation.findUnique({ where: { callId } });
    if (!row) return null;
    if ('project_id' in row)
      return { id: row.id, projectId: row.project_id, analysisRunId: row.analysis_run_id, callId: row.call_id, requestHash: row.request_hash, worstCaseMicrousd: row.worst_case_microusd, providerResponseId: row.provider_response_id, usageEventId: row.usage_event_id, status: row.status };
    return { id: row.id, projectId: row.projectId, analysisRunId: row.analysisRunId, callId: row.callId, requestHash: row.requestHash, worstCaseMicrousd: row.worstCaseMicrousd, providerResponseId: row.providerResponseId, usageEventId: row.usageEventId, status: row.status };
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
