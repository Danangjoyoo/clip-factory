import type { AIUsageEventEntityDto } from '../dto/entity';
import type { AnalysisTransaction } from './unit-of-work.port';
export interface AIUsageEventRepository {
  findByProviderResponseId(
    id: string,
    tx?: AnalysisTransaction,
  ): Promise<AIUsageEventEntityDto | null>;
  insert(
    event: Omit<AIUsageEventEntityDto, 'id'>,
    tx?: AnalysisTransaction,
  ): Promise<AIUsageEventEntityDto>;
}
