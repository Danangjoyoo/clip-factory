import { equalShare } from '../../domain/equal-share-allocation';
import { CostAllocationDataService } from '../data-services/cost-allocation.data-service';
import type { AnalysisTransaction } from '../ports/unit-of-work.port';
export class AllocateSharedCostService {
  constructor(private readonly allocations: CostAllocationDataService) {}
  execute(
    analysisRunId: string,
    totalMicrousd: bigint,
    rankedClipIds: readonly string[],
    tx?: AnalysisTransaction,
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
