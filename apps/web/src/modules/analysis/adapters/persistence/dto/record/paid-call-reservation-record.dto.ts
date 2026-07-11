export type PaidCallReservationRecordDto = {
  id: string;
  projectId: string;
  analysisRunId: string;
  callId: string;
  requestHash: string;
  worstCaseMicrousd: bigint;
  status: string;
  providerResponseId: string | null;
  usageEventId: string | null;
};
