import type { SourceAssetRepository } from '../../../application/ports/source-asset.repository';
import type { TransactionContext } from '../../../application/ports/project.repository';
import type { CreateSourceAssetEntityDto } from '../../../application/dto/entity';
import {
  sourceAssetEntityToRecord,
  sourceAssetRecordToEntity,
} from '../converters/source-asset.converter';
import { prisma } from '../../../../../infrastructure/prisma/client';
import {
  JsonNull,
  type InputJsonValue,
} from '../../../../../generated/prisma/internal/prismaNamespace';
export class PrismaSourceAssetRepository implements SourceAssetRepository {
  private db(tx: TransactionContext) {
    return (
      (tx as { sourceAsset?: typeof prisma.sourceAsset } | undefined)
        ?.sourceAsset ?? prisma.sourceAsset
    );
  }
  async insert(input: CreateSourceAssetEntityDto, tx: TransactionContext) {
    const now = new Date();
    const record = sourceAssetEntityToRecord({
      ...input,
      id: '',
      createdAt: now,
      updatedAt: now,
    });
    const r = await this.db(tx).create({
      data: {
        projectId: record.projectId,
        kind: record.kind,
        displayPath: record.displayPath,
        resolvedPath: record.resolvedPath,
        objectKey: record.objectKey,
        objectVersionId: record.objectVersionId,
        objectSha256: record.objectSha256,
        sizeBytes: record.sizeBytes,
        modifiedAt: record.modifiedAt,
        fingerprint: record.fingerprint,
        probeJson:
          record.probeJson === null
            ? JsonNull
            : (record.probeJson as InputJsonValue),
        health: record.health,
      },
    });
    return sourceAssetRecordToEntity(r);
  }
  async findByProjectId(projectId: string) {
    const r = await prisma.sourceAsset.findUnique({ where: { projectId } });
    return r ? sourceAssetRecordToEntity(r) : null;
  }
  async deleteByProjectId(projectId: string, tx: TransactionContext) {
    await this.db(tx).delete({ where: { projectId } });
  }
}
