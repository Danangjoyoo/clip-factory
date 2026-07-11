import type { CaptionDocumentV1 } from '../../../domain/caption';
import type { ProjectMode } from '../../../../projects/domain/project';

export interface ClipEntityDto {
  id: string;
  projectId: string;
  analysisRunId: string | null;
  origin: 'AI_HIGHLIGHT' | 'MANUAL';
  startMs: number;
  endMs: number;
  title: string | null;
  rank: number | null;
  score: unknown | null;
  captionDocument: CaptionDocumentV1;
  style: unknown;
  frame: unknown;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  selectionCostMicrousd: bigint;
}

export type AddManualClipEntityRequest = {
  projectId: string;
  startTimecode: string;
  endTimecode: string;
  idempotencyKey?: string;
};

export type ClipMode = ProjectMode;
