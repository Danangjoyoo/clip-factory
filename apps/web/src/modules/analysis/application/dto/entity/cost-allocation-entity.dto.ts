export interface CostAllocationEntityDto {
  id: string;
  analysisRunId: string;
  clipId: string;
  method: 'EQUAL_SHARE';
  amountMicrousd: bigint;
  label: 'allocated estimate';
  methodLabel: 'equal share';
  createdAt: Date;
}
