import type { CaptionDocumentV1 } from '../../../../domain/caption';
export interface ClipRecordDto {
  id: string;
  projectId: string;
  analysisRunId: string | null;
  origin: 'AI_HIGHLIGHT' | 'MANUAL';
  startMs: number;
  endMs: number;
  title: string | null;
  rank: number | null;
  scoreJson: unknown | null;
  captionJson: CaptionDocumentV1;
  styleJson: unknown;
  frameJson: unknown;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}
