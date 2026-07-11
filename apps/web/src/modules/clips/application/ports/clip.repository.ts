import type { ClipEntityDto, CreateManualClip } from '../dto/entity';
export type ClipTransaction = unknown;
export interface ClipRepository {
  createManual(input: CreateManualClip, tx?: ClipTransaction): Promise<ClipEntityDto>;
  findByIdempotency?(projectId: string, key: string): Promise<ClipEntityDto | null>;
}
