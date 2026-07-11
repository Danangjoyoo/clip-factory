import { prisma } from '../../../../../infrastructure/prisma/client';
import type { TranscriptRepository } from '../../../application/ports/transcript.repository';
import type { TranscriptEntityDto } from '../../../application/dto/entity';
import { transcriptRecordToEntity, transcriptEntityToRecord } from '../converters/transcript.converter';
export class PrismaTranscriptRepository implements TranscriptRepository {
  async insert(input: Omit<TranscriptEntityDto, 'id' | 'createdAt'>) { const row = await prisma.transcript.create({ data: transcriptEntityToRecord(input) }); return transcriptRecordToEntity(row as unknown as TranscriptEntityDto); }
  async findByProjectId(projectId: string) { const row = await prisma.transcript.findUnique({ where: { projectId } }); return row ? transcriptRecordToEntity(row as unknown as TranscriptEntityDto) : null; }
}
