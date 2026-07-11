import { prisma } from '../../../../../infrastructure/prisma/client';
import type { TranscriptRepository } from '../../../application/ports/transcript.repository';
import type { TranscriptEntityDto } from '../../../application/dto/entity';
import { transcriptRecordToEntity, transcriptEntityToRecord } from '../converters/transcript.converter';
import type { TranscriptRecordDto } from '../dto/record/transcript-record.dto';
export class PrismaTranscriptRepository implements TranscriptRepository {
  async insert(input: Omit<TranscriptEntityDto, 'id' | 'createdAt'>) {
    const row = await prisma.transcript.create({ data: transcriptEntityToRecord(input) });
    return transcriptRecordToEntity(toRecord(row));
  }
  async findByProjectId(projectId: string) {
    const row = await prisma.transcript.findUnique({ where: { projectId } });
    return row ? transcriptRecordToEntity(toRecord(row)) : null;
  }
}

function toRecord(row: { id: string; projectId: string; sourceAssetId: string; backend: string; model: string; modelRevision: string; weightsSha256: string | null; languageTag: string; objectBucket: string; objectKey: string; objectVersionId: string | null; objectSha256: string; durationMs: number; wordCount: number; runtimeMs: number; createdAt: Date }): TranscriptRecordDto {
  return { id: row.id, projectId: row.projectId, sourceAssetId: row.sourceAssetId, backend: row.backend, model: row.model, modelRevision: row.modelRevision, weightsSha256: row.weightsSha256, languageTag: row.languageTag, objectBucket: row.objectBucket, objectKey: row.objectKey, objectVersionId: row.objectVersionId, objectSha256: row.objectSha256, durationMs: row.durationMs, wordCount: row.wordCount, runtimeMs: row.runtimeMs, createdAt: row.createdAt };
}
