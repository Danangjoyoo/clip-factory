import type {
  CreateSourceAssetEntityDto,
  SourceAssetEntityDto,
} from '../dto/entity';
import type { TransactionContext } from './project.repository';
import type { ApplySourceValidationCommand } from '../dto/entity/worker-source-locator-entity.dto';
import type { ImmutableObjectReference } from '../../../storage/application/ports/artifact-store.port';
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
  attachUploadedObject?(
    projectId: string,
    reference: ImmutableObjectReference,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  relink?(
    id: string,
    candidate: Pick<
      SourceAssetEntityDto,
      | 'displayPath'
      | 'resolvedPath'
      | 'sizeBytes'
      | 'modifiedAt'
      | 'fingerprint'
      | 'probe'
      | 'health'
    >,
    tx: TransactionContext,
  ): Promise<SourceAssetEntityDto>;
  markRelinking?(id: string): Promise<void>;
}
