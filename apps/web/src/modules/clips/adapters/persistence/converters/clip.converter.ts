import type { ClipEntityDto, CreateManualClip } from '../../../application/dto/entity';
import { validateCaptionDocument, type CaptionDocumentV1 } from '../../../domain/caption';
import type { ClipRecordDto } from '../dto/record/clip-record.dto';
export const clipRecordToEntity = (r: ClipRecordDto): ClipEntityDto => ({ id: r.id, projectId: r.projectId, analysisRunId: r.analysisRunId, origin: r.origin, startMs: r.startMs, endMs: r.endMs, title: r.title, rank: r.rank, score: r.scoreJson, captionDocument: validateCaptionDocument(r.captionJson as CaptionDocumentV1), state: r.state, createdAt: r.createdAt, updatedAt: r.updatedAt, selectionCostMicrousd: r.analysisRunId ? 0n : 0n });
export const clipEntityToRecord = (e: CreateManualClip) => ({ projectId: e.projectId, analysisRunId: null, origin: 'MANUAL' as const, startMs: e.startMs, endMs: e.endMs, title: null, rank: null, scoreJson: null, captionJson: e.captionDocument, styleJson: {}, frameJson: {}, state: 'CANDIDATE' as const });
