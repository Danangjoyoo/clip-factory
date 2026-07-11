import type { AnalysisRunEntityDto } from '../dto/entity';
import type { AnalysisTransaction } from './unit-of-work.port';
export interface AnalysisRunRepository {
  findById(
    id: string,
    tx?: AnalysisTransaction,
  ): Promise<AnalysisRunEntityDto | null>;
  addActualCost(
    id: string,
    amount: bigint,
    tx?: AnalysisTransaction,
  ): Promise<void>;
  addUncertain(
    id: string,
    amount: bigint,
    tx?: AnalysisTransaction,
  ): Promise<void>;
  reconcileUncertain(
    id: string,
    amount: bigint,
    tx?: AnalysisTransaction,
  ): Promise<void>;
}
