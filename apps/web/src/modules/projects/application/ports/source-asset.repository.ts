import type {
  CreateSourceAssetEntityDto,
  SourceAssetEntityDto,
} from '../dto/entity';
import type { TransactionContext } from './project.repository';
export interface SourceAssetRepository {
  insert(
    input: CreateSourceAssetEntityDto,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  findByProjectId(projectId: string): Promise<SourceAssetEntityDto | null>;
  deleteByProjectId(projectId: string, tx: TransactionContext): Promise<void>;
}
