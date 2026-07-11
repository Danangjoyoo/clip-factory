import { equalShare } from '../../domain/equal-share-allocation';
import { CostAllocationDataService } from '../data-services/cost-allocation.data-service';
export class AllocateSharedCostService {
  constructor(private readonly allocations: CostAllocationDataService) {}
  execute(
    analysisRunId: string,
    totalMicrousd: bigint,
    rankedClipIds: readonly string[],
    tx?: unknown,
  ) {
    const rows = equalShare(totalMicrousd, rankedClipIds).map((row) => ({
      ...row,
      analysisRunId,
    }));
    return rows.length
      ? this.allocations.insertMany(rows, tx)
      : Promise.resolve([]);
  }
}
