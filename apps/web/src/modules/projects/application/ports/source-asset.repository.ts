import type {
  CreateSourceAssetEntityDto,
  SourceAssetEntityDto,
} from '../dto/entity';
import type { TransactionContext } from './project.repository';
import type { ApplySourceValidationCommand } from '../dto/entity/worker-source-locator-entity.dto';
export interface SourceAssetRepository {
  insert(
    input: CreateSourceAssetEntityDto,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  findByProjectId(projectId: string): Promise<SourceAssetEntityDto | null>;
  findById(id: string): Promise<SourceAssetEntityDto | null>;
  applyValidatedLocator(
    input: ApplySourceValidationCommand,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  deleteByProjectId(projectId: string, tx: TransactionContext): Promise<void>;
}
