import type { ClipRepository } from '../ports/clip.repository';
import type { ClipEntityDto } from '../dto/entity';

export class ClipDataService {
  constructor(private readonly repository: ClipRepository) {}
  createManual(input: Omit<ClipEntityDto, 'id' | 'createdAt' | 'updatedAt' | 'selectionCostMicrousd'>, idempotencyKey?: string) {
    return this.repository.createManual(input, idempotencyKey);
  }
}
