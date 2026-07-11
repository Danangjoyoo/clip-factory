import type { CreateSourceAssetEntityDto } from '../dto/entity';
import type { SourceAssetRepository } from '../ports/source-asset.repository';
import type { TransactionContext } from '../ports/project.repository';
export class SourceAssetDataService {
  constructor(private readonly repository: SourceAssetRepository) {}
  create(input: CreateSourceAssetEntityDto, tx: TransactionContext) {
    return this.repository.insert(input, tx);
  }
  getByProjectId(id: string) {
    return this.repository.findByProjectId(id);
  }
  deleteByProjectId(id: string, tx: TransactionContext) {
    return this.repository.deleteByProjectId(id, tx);
  }
}
