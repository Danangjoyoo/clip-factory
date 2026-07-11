import type { ClipRepository } from '../ports/clip.repository';
import type { CreateManualClip } from '../dto/entity';
export class ClipDataService {
  constructor(private readonly repository: ClipRepository) {}
  createManual(input: CreateManualClip, tx?: unknown) { return this.repository.createManual(input, tx); }
}
