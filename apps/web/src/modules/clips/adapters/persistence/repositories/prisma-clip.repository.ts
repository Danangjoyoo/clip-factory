import { prisma } from '../../../../../infrastructure/prisma/client';
import { Prisma } from '../../../../../generated/prisma/client';
import type { ClipRepository } from '../../../application/ports/clip.repository';
import type { ClipEntityDto } from '../../../application/dto/entity';
import { clipRecordToEntity } from '../converters/clip.converter';
export class PrismaClipRepository implements ClipRepository {
  async createManual(input: Omit<ClipEntityDto, 'id' | 'createdAt' | 'updatedAt' | 'selectionCostMicrousd'>): Promise<ClipEntityDto> {
    const row = await prisma.clip.create({ data: { projectId: input.projectId, analysisRunId: null, origin: 'MANUAL', startMs: input.startMs, endMs: input.endMs, title: input.title, rank: null, scoreJson: Prisma.JsonNull, captionJson: input.captionDocument as Prisma.InputJsonValue, styleJson: input.style as Prisma.InputJsonValue, frameJson: input.frame as Prisma.InputJsonValue, state: 'CANDIDATE' } });
    return clipRecordToEntity({ ...row, origin: row.origin, state: row.state, captionJson: row.captionJson, scoreJson: row.scoreJson, styleJson: row.styleJson, frameJson: row.frameJson } as never);
  }
}
