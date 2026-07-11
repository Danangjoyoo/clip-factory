import type { CreateSourceAssetEntityDto } from '../dto/entity';
import type { SourceAssetRepository } from '../ports/source-asset.repository';
import type { TransactionContext } from '../ports/project.repository';
import type { ImmutableObjectReference } from '../../../storage/application/ports/artifact-store.port';
export class SourceAssetDataService {
  constructor(private readonly repository: SourceAssetRepository) {}
  create(input: CreateSourceAssetEntityDto, tx: TransactionContext) {
    return this.repository.insert(input, tx);
  }
  getByProjectId(id: string) {
    return this.repository.findByProjectId(id);
  }
  findById(id: string) { return this.repository.findById(id); }
  applyValidatedLocator(
    input: import('../dto/entity/worker-source-locator-entity.dto').ApplySourceValidationCommand,
    tx: TransactionContext,
  ) {
    return this.repository.applyValidatedLocator(input, tx);
  }
  deleteByProjectId(id: string, tx: TransactionContext) {
    return this.repository.deleteByProjectId(id, tx);
  }
  attachUploadedObject(projectId: string, reference: ImmutableObjectReference, tx: TransactionContext) {
    return this.repository.attachUploadedObject(projectId, reference, tx);
  }
}
