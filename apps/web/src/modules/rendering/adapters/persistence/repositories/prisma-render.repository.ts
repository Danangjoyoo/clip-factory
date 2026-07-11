import { renderEntityToRecord, renderRecordToEntity } from '../converters/render.converter';
import type { RenderEntityDto } from '../../../application/dto/entity';
import type { RenderRepository } from '../../../application/ports/render.repository';
type PrismaDb = typeof import('../../../../../infrastructure/prisma/client').prisma;
export class PrismaRenderRepository implements RenderRepository {
  constructor(private readonly db?: PrismaDb) {}

  async findById(id: string) {
    const db = this.db ?? (await import('../../../../../infrastructure/prisma/client')).prisma;
    const row = await db.render.findUnique({ where: { id } });
    const retryOfRenderId = row && (row as typeof row & { retryOfRenderId: string | null }).retryOfRenderId;
    return row ? renderRecordToEntity({
      renderId: row.id, projectId: row.projectId, clipId: row.clipId,
      inputSnapshotJson: row.inputSnapshotJson, status: row.status,
      outputObjectKey: row.outputObjectKey, srtObjectKey: row.srtObjectKey,
      retryOfRenderId, errorCode: row.errorCode,
    }) : null;
  }

  async save(render: RenderEntityDto) {
    const db = this.db ?? (await import('../../../../../infrastructure/prisma/client')).prisma;
    const record = renderEntityToRecord(render);
    const row = await db.render.upsert({
      where: { id: record.renderId },
      create: { id: record.renderId, projectId: record.projectId, clipId: record.clipId,
        inputSnapshotJson: record.inputSnapshotJson as object, status: record.status as never,
        outputObjectKey: record.outputObjectKey, srtObjectKey: record.srtObjectKey,
        retryOfRenderId: record.retryOfRenderId, errorCode: record.errorCode, encoder: render.encoder.strategy },
      update: { projectId: record.projectId, clipId: record.clipId,
        inputSnapshotJson: record.inputSnapshotJson as object, status: record.status as never,
        outputObjectKey: record.outputObjectKey, srtObjectKey: record.srtObjectKey,
        retryOfRenderId: record.retryOfRenderId, errorCode: record.errorCode, encoder: render.encoder.strategy },
    });
    return renderRecordToEntity({ renderId: row.id, projectId: row.projectId, clipId: row.clipId,
      inputSnapshotJson: row.inputSnapshotJson, status: row.status, outputObjectKey: row.outputObjectKey,
      srtObjectKey: row.srtObjectKey, retryOfRenderId: (row as typeof row & { retryOfRenderId: string | null }).retryOfRenderId, errorCode: row.errorCode });
  }
}
