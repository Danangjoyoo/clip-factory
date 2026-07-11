export type CostAllocation = {
  clipId: string;
  method: 'EQUAL_SHARE';
  amountMicrousd: bigint;
  label: 'allocated estimate';
  methodLabel: 'equal share';
};

export const equalShare = (
  totalMicrousd: bigint,
  rankedClipIds: readonly string[],
): CostAllocation[] => {
  if (totalMicrousd < 0n) throw new Error('NEGATIVE_COST');
  if (!rankedClipIds.length) return [];
  const base = totalMicrousd / BigInt(rankedClipIds.length);
  const remainder = totalMicrousd % BigInt(rankedClipIds.length);
  return rankedClipIds.map((clipId, index) => ({
    clipId,
    method: 'EQUAL_SHARE',
    amountMicrousd: base + (BigInt(index) < remainder ? 1n : 0n),
    label: 'allocated estimate',
    methodLabel: 'equal share',
  }));
};
