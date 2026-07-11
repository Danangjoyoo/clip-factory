import type { CaptionDocumentV1 } from '../../../domain/caption';

export type ClipOrigin = 'MANUAL' | 'AI_HIGHLIGHT';
export interface ClipEntityDto {
  id: string; projectId: string; analysisRunId: string | null; origin: ClipOrigin;
  startMs: number; endMs: number; title: string | null; rank: number | null;
  score: unknown | null; captionDocument: CaptionDocumentV1; state: string;
  createdAt: Date; updatedAt: Date; selectionCostMicrousd: bigint;
}
export type AddManualClipEntityRequest = { projectId: string; startTimecode: string; endTimecode: string; idempotencyKey?: string };
export type CreateManualClip = Pick<ClipEntityDto, 'projectId' | 'startMs' | 'endMs' | 'captionDocument'>;
