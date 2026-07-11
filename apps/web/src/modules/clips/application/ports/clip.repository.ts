import type { ClipEntityDto } from '../dto/entity';

export interface ClipRepository {
  createManual(input: Omit<ClipEntityDto, 'id' | 'createdAt' | 'updatedAt' | 'selectionCostMicrousd'>, idempotencyKey?: string): Promise<ClipEntityDto>;
}
