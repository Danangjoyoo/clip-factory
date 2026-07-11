import type { AnalysisRunRepository } from '../ports/analysis-run.repository';
import type { AnalysisTransaction } from '../ports/unit-of-work.port';
export class AnalysisRunDataService {
  constructor(private readonly repository: AnalysisRunRepository) {}
  findById(id: string, tx?: AnalysisTransaction) {
    return this.repository.findById(id, tx);
  }
  addActualCost(id: string, amount: bigint, tx?: AnalysisTransaction) {
    return this.repository.addActualCost(id, amount, tx);
  }
  addUncertain(id: string, amount: bigint, tx?: AnalysisTransaction) {
    return this.repository.addUncertain(id, amount, tx);
  }
  reconcileUncertain(id: string, amount: bigint, tx?: AnalysisTransaction) {
    return this.repository.reconcileUncertain(id, amount, tx);
  }
}
