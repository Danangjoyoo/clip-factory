import type { TranscriptEntityDto } from '../../../application/dto/entity';
import type { TranscriptRecordDto } from '../dto/record/transcript-record.dto';
export const transcriptRecordToEntity = (r: TranscriptRecordDto): TranscriptEntityDto => ({ ...r, backend: assertBackend(r.backend) });
export const transcriptEntityToRecord = (e: Omit<TranscriptEntityDto, 'id' | 'createdAt'>): Omit<TranscriptRecordDto, 'id' | 'createdAt'> => ({
  projectId: e.projectId, sourceAssetId: e.sourceAssetId, backend: e.backend,
  model: e.model, modelRevision: e.modelRevision, weightsSha256: e.weightsSha256,
  languageTag: e.languageTag, objectBucket: e.objectBucket, objectKey: e.objectKey,
  objectVersionId: e.objectVersionId, objectSha256: e.objectSha256, durationMs: e.durationMs,
  wordCount: e.wordCount, runtimeMs: e.runtimeMs,
});

function assertBackend(value: string): TranscriptEntityDto['backend'] {
  if (value === 'MLX_WHISPER' || value === 'FAKE') return value;
  throw new Error('INVALID_TRANSCRIPT_BACKEND');
}
