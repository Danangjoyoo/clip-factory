import type { TranscriptEntityDto } from '../dto/entity';
export interface TranscriptRepository {
  insert(
    input: Omit<TranscriptEntityDto, 'id' | 'createdAt'>,
  ): Promise<TranscriptEntityDto>;
  findByProjectId(projectId: string): Promise<TranscriptEntityDto | null>;
}
