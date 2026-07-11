import type { AIUsageEventEntityDto } from '../dto/entity';
import type { AIUsageEventRepository } from '../ports/ai-usage-event.repository';
import type { AnalysisTransaction } from '../ports/unit-of-work.port';
export class AIUsageEventDataService {
  constructor(private readonly repository: AIUsageEventRepository) {}
  findByProviderResponseId(id: string, tx?: AnalysisTransaction) {
    return this.repository.findByProviderResponseId(id, tx);
  }
  insert(event: Omit<AIUsageEventEntityDto, 'id'>, tx?: AnalysisTransaction) {
    return this.repository.insert(event, tx);
  }
}
