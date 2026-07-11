import type { ClipEntityDto } from '../../../application/dto/entity';
import type { ClipRecordDto } from '../dto/record/clip-record.dto';
export const clipRecordToEntity = (r: ClipRecordDto): ClipEntityDto => ({
  id: r.id,
  projectId: r.projectId,
  analysisRunId: r.analysisRunId,
  origin: r.origin,
  startMs: r.startMs,
  endMs: r.endMs,
  title: r.title,
  rank: r.rank,
  score: r.scoreJson,
  captionDocument: r.captionJson,
  style: r.styleJson,
  frame: r.frameJson,
  state: r.state,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  selectionCostMicrousd: r.analysisRunId ? 0n : 0n,
});
export const clipEntityToRecord = (
  e: Omit<
    ClipEntityDto,
    'id' | 'createdAt' | 'updatedAt' | 'selectionCostMicrousd'
  >,
): Omit<ClipRecordDto, 'id' | 'createdAt' | 'updatedAt'> => ({
  projectId: e.projectId,
  analysisRunId: e.analysisRunId,
  origin: e.origin,
  startMs: e.startMs,
  endMs: e.endMs,
  title: e.title,
  rank: e.rank,
  scoreJson: e.score,
  captionJson: e.captionDocument,
  styleJson: e.style,
  frameJson: e.frame,
  state: e.state,
});
