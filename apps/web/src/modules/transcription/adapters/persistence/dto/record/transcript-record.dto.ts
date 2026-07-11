export interface TranscriptRecordDto {
  id: string; projectId: string; sourceAssetId: string; backend: string;
  model: string; modelRevision: string; weightsSha256: string | null;
  languageTag: string; objectBucket: string; objectKey: string;
  objectVersionId: string | null; objectSha256: string; durationMs: number;
  wordCount: number; runtimeMs: number; createdAt: Date;
}
