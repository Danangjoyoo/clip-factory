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
  findById?(id: string): Promise<SourceAssetEntityDto | null>;
  applyValidatedLocator?(
    input: SourceAssetEntityDto,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  deleteByProjectId(projectId: string, tx: TransactionContext): Promise<void>;
}
