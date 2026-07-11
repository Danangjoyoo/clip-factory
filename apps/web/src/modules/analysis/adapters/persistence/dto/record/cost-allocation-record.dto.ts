export type CostAllocationRecordDto = {
  id: string;
  analysisRunId: string;
  clipId: string;
  method: 'EQUAL_SHARE';
  amountMicrousd: bigint;
  createdAt: Date;
};
