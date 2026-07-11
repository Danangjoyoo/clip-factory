import type { TranscriptEntityDto } from '../../../application/dto/entity';
import type { TranscriptRecordDto } from '../dto/record/transcript-record.dto';
const MLX_MODEL_REVISION = '49e6aa286ad60c14352c404340ded53710378a11';
const MLX_WEIGHTS_SHA256 =
  '05ff791ce3630fae47e7c51004e9666204d786246ec07cac6110af768099b40d';
const SHA256 = /^[a-f0-9]{64}$/;

export const transcriptRecordToEntity = (
  r: TranscriptRecordDto,
): TranscriptEntityDto => {
  validateTranscript(r);
  return { ...r, backend: assertBackend(r.backend) };
};
export const transcriptEntityToRecord = (
  e: Omit<TranscriptEntityDto, 'id' | 'createdAt'>,
): Omit<TranscriptRecordDto, 'id' | 'createdAt'> => ({
  ...validateEntity(e),
});

function validateEntity(
  e: Omit<TranscriptEntityDto, 'id' | 'createdAt'>,
): Omit<TranscriptRecordDto, 'id' | 'createdAt'> {
  validateTranscript(e);
  return {
    projectId: e.projectId,
    sourceAssetId: e.sourceAssetId,
    backend: e.backend,
    model: e.model,
    modelRevision: e.modelRevision,
    weightsSha256: e.weightsSha256,
    languageTag: e.languageTag,
    objectBucket: e.objectBucket,
    objectKey: e.objectKey,
    objectVersionId: e.objectVersionId,
    objectSha256: e.objectSha256,
    durationMs: e.durationMs,
    wordCount: e.wordCount,
    runtimeMs: e.runtimeMs,
  };
}

function validateTranscript(
  value: Pick<
    TranscriptRecordDto,
    | 'backend'
    | 'model'
    | 'modelRevision'
    | 'weightsSha256'
    | 'objectBucket'
    | 'objectKey'
    | 'objectVersionId'
    | 'objectSha256'
  >,
): void {
  const backend = assertBackend(value.backend);
  if (
    !value.model ||
    !value.modelRevision ||
    !value.objectBucket ||
    !value.objectKey ||
    !value.objectVersionId
  ) {
    throw new Error('INVALID_TRANSCRIPT_PROVENANCE');
  }
  if (!SHA256.test(value.objectSha256))
    throw new Error('INVALID_TRANSCRIPT_ARTIFACT_HASH');
  if (backend === 'FAKE' && value.weightsSha256 !== null)
    throw new Error('INVALID_TRANSCRIPT_WEIGHTS_HASH');
  if (
    backend === 'MLX_WHISPER' &&
    (value.modelRevision !== MLX_MODEL_REVISION ||
      value.weightsSha256 !== MLX_WEIGHTS_SHA256)
  ) {
    throw new Error('INVALID_TRANSCRIPT_MODEL_PROVENANCE');
  }
  if (value.weightsSha256 !== null && !SHA256.test(value.weightsSha256))
    throw new Error('INVALID_TRANSCRIPT_WEIGHTS_HASH');
}

function assertBackend(value: string): TranscriptEntityDto['backend'] {
  if (value === 'MLX_WHISPER' || value === 'FAKE') return value;
  throw new Error('INVALID_TRANSCRIPT_BACKEND');
}
