import type { AnalysisTransaction } from './unit-of-work.port';
export interface PaidCallReservationEntity {
  id: string;
  projectId: string;
  analysisRunId: string;
  callId: string;
  requestHash: string;
  worstCaseMicrousd: bigint;
  providerResponseId?: string | null;
  usageEventId?: string | null;
  status: string;
}
export interface PaidCallReservationRepository {
  lockByCallId(
    callId: string,
    tx?: AnalysisTransaction,
  ): Promise<PaidCallReservationEntity | null>;
  complete(
    input: {
      callId: string;
      projectId: string;
      analysisRunId: string;
      requestHash: string;
      providerResponseId: string;
      usageEventId: string;
    },
    tx?: AnalysisTransaction,
  ): Promise<void>;
}
