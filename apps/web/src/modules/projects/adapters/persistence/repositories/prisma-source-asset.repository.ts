import type { SourceAssetRepository } from '../../../application/ports/source-asset.repository';
import type { TransactionContext } from '../../../application/ports/project.repository';
import type { CreateSourceAssetEntityDto } from '../../../application/dto/entity';
import {
  sourceAssetEntityToRecord,
  sourceAssetRecordToEntity,
} from '../converters/source-asset.converter';
import { prisma } from '../../../../../infrastructure/prisma/client';
import { JsonNull } from '../../../../../generated/prisma/internal/prismaNamespace';
import { toPrismaJsonInput } from '../converters/prisma-json.converter';
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
      projectId: input.projectId,
      kind: input.kind,
      displayPath: input.displayPath,
      resolvedPath: input.resolvedPath,
      objectKey: input.objectKey,
      objectVersionId: input.objectVersionId,
      objectSha256: input.objectSha256,
      sizeBytes: input.sizeBytes,
      modifiedAt: input.modifiedAt,
      fingerprint: input.fingerprint,
      probe: input.probe,
      health: input.health,
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
            : toPrismaJsonInput(record.probeJson),
        health: record.health,
      },
    });
    return sourceAssetRecordToEntity(r);
  }
  async findByProjectId(projectId: string) {
    const r = await prisma.sourceAsset.findUnique({ where: { projectId } });
    return r ? sourceAssetRecordToEntity(r) : null;
  }
  async findById(id: string) {
    const r = await prisma.sourceAsset.findUnique({ where: { id } });
    return r ? sourceAssetRecordToEntity(r) : null;
  }
  async applyValidatedLocator(input: import('../../../application/dto/entity/worker-source-locator-entity.dto').ApplySourceValidationCommand, tx: TransactionContext) {
    const db = this.db(tx);
    const r = await db.update({
      where: { id: input.sourceAssetId },
      data: {
        resolvedPath: input.resolvedPath,
        sizeBytes: input.sizeBytes,
        modifiedAt: new Date(input.modifiedAt),
        fingerprint: input.fingerprint,
        probeJson: toPrismaJsonInput(input.probe),
        health: 'LOCATED',
      },
    });
    return sourceAssetRecordToEntity(r);
  }
  async deleteByProjectId(projectId: string, tx: TransactionContext) {
    await this.db(tx).delete({ where: { projectId } });
  }
  async attachUploadedObject(projectId: string, reference: import('../../../../storage/application/ports/artifact-store.port').ImmutableObjectReference, tx: TransactionContext) {
    const db = this.db(tx);
    const current = await db.findUnique({ where: { projectId } });
    if (!current || current.kind !== 'BROWSER_UPLOAD') throw new Error('source is not browser upload');
    const r = await db.update({ where: { projectId }, data: { objectKey: reference.key, objectVersionId: reference.versionId, objectSha256: reference.sha256, sizeBytes: reference.sizeBytes, health: 'LOCATED' } });
    return sourceAssetRecordToEntity(r);
  }
  async relink(id: string, candidate: Pick<import('../../../application/dto/entity/source-asset-entity.dto').SourceAssetEntityDto, 'displayPath' | 'resolvedPath' | 'sizeBytes' | 'modifiedAt' | 'fingerprint' | 'probe' | 'health'>, tx: TransactionContext) {
    const r = await this.db(tx).update({ where: { id }, data: { displayPath: candidate.displayPath, resolvedPath: candidate.resolvedPath, sizeBytes: candidate.sizeBytes, modifiedAt: candidate.modifiedAt, fingerprint: candidate.fingerprint, probeJson: toPrismaJsonInput(candidate.probe), health: candidate.health } });
    return sourceAssetRecordToEntity(r);
  }
  async markRelinking(id: string) {
    await prisma.sourceAsset.update({ where: { id }, data: { project: { update: { status: 'RELINKING_SOURCE' } } } });
  }
}
