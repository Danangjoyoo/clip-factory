import type { CostAllocationEntityDto } from '../dto/entity';
import type { AnalysisTransaction } from './unit-of-work.port';
export interface CostAllocationRepository {
  insertMany(
    rows: readonly Omit<CostAllocationEntityDto, 'id' | 'createdAt'>[],
    tx?: AnalysisTransaction,
  ): Promise<CostAllocationEntityDto[]>;
}
