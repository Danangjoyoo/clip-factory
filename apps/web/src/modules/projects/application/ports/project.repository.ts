import type { CreateProjectEntityDto, ProjectEntityDto } from '../dto/entity';
export type TransactionContext = unknown;
export interface ProjectRepository {
  insert(
    input: CreateProjectEntityDto,
    tx: TransactionContext,
  ): Promise<ProjectEntityDto>;
  findById(id: string): Promise<ProjectEntityDto | null>;
  list(): Promise<readonly ProjectEntityDto[]>;
  delete(id: string, tx: TransactionContext): Promise<void>;
}
