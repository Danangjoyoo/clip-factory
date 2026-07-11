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
    if (!this.repository.attachUploadedObject) throw new Error('upload attachment unsupported');
    return this.repository.attachUploadedObject(projectId, reference, tx);
  }
  relink(id: string, candidate: Pick<import('../dto/entity/source-asset-entity.dto').SourceAssetEntityDto, 'displayPath' | 'resolvedPath' | 'sizeBytes' | 'modifiedAt' | 'fingerprint' | 'probe' | 'health'>, tx: TransactionContext) {
    if (!this.repository.relink) throw new Error('relink unsupported');
    return this.repository.relink(id, candidate, tx);
  }
}
