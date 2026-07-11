import type { CostAllocationEntityDto } from '../dto/entity';
import type { CostAllocationRepository } from '../ports/cost-allocation.repository';
import type { AnalysisTransaction } from '../ports/unit-of-work.port';
export class CostAllocationDataService {
  constructor(private readonly repository: CostAllocationRepository) {}
  insertMany(
    rows: readonly Omit<CostAllocationEntityDto, 'id' | 'createdAt'>[],
    tx?: AnalysisTransaction,
  ) {
    return this.repository.insertMany(rows, tx);
  }
}
