import type { SourceAssetRepository } from '../../../application/ports/source-asset.repository';
import type { TransactionContext } from '../../../application/ports/project.repository';
import type { CreateSourceAssetEntityDto } from '../../../application/dto/entity';
import { sourceAssetRecordToEntity } from '../converters/source-asset.converter';
import { prisma } from '../../../../../infrastructure/prisma/client';
export class PrismaSourceAssetRepository implements SourceAssetRepository {
  private db(tx: TransactionContext) {
    return (
      (tx as { sourceAsset?: typeof prisma.sourceAsset } | undefined)
        ?.sourceAsset ?? prisma.sourceAsset
    );
  }
  async insert(input: CreateSourceAssetEntityDto, tx: TransactionContext) {
    const r = await this.db(tx).create({
      data: { ...input, probeJson: input.probe as never } as never,
    });
    return sourceAssetRecordToEntity(r as never);
  }
  async findByProjectId(projectId: string) {
    const r = await prisma.sourceAsset.findUnique({ where: { projectId } });
    return r ? sourceAssetRecordToEntity(r as never) : null;
  }
  async deleteByProjectId(projectId: string, tx: TransactionContext) {
    await this.db(tx).delete({ where: { projectId } });
  }
}
