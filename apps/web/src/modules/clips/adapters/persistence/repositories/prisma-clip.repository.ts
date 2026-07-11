import { prisma } from '../../../../../infrastructure/prisma/client';
import type { ClipRepository } from '../../../application/ports/clip.repository';
import type { CreateManualClip } from '../../../application/dto/entity';
import { clipEntityToRecord, clipRecordToEntity } from '../converters/clip.converter';
import type { ClipRecordDto } from '../dto/record/clip-record.dto';
export class PrismaClipRepository implements ClipRepository {
  async createManual(input: CreateManualClip, tx?: unknown) {
    const db = (tx as { clip?: typeof prisma.clip } | undefined)?.clip ?? prisma.clip;
    const row = await db.create({ data: clipEntityToRecord(input) });
    return clipRecordToEntity(row as unknown as ClipRecordDto);
  }
}
