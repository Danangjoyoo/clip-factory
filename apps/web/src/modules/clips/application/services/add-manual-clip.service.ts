import type { ProjectDataService } from '../../../projects/application/data-services/project.data-service';
import type { SourceAssetDataService } from '../../../projects/application/data-services/source-asset.data-service';
import type { ClipPreparationPort } from '../ports/clip-preparation.port';
import type { TranscriptDocumentPort } from '../ports/transcript-document.port';
import type { ClipDataService } from '../data-services/clip.data-service';
import type { AddManualClipEntityRequest, ClipEntityDto } from '../dto/entity';
import { parseTimecode, ClipEditError } from '../../domain/timecode';
import { BuildCaptionDocumentService } from './build-caption-document.service';

export class ClipError extends Error { constructor(public readonly code: string) { super(code); } }

export class AddManualClipService {
  constructor(
    private readonly projects: ProjectDataService,
    private readonly sources: SourceAssetDataService,
    private readonly transcripts: TranscriptDocumentPort,
    private readonly clips: ClipDataService,
    private readonly preparation: ClipPreparationPort,
    private readonly captions = new BuildCaptionDocumentService({ next: () => crypto.randomUUID() }),
  ) {}

  async execute(input: AddManualClipEntityRequest): Promise<ClipEntityDto> {
    const project = await this.projects.get(input.projectId);
    if (!project) throw new ClipError('PROJECT_NOT_FOUND');
    const source = await this.sources.getByProjectId(project.id);
    if (!source) throw new ClipError('SOURCE_NOT_FOUND');
    const duration = source.probe && typeof source.probe === 'object' && 'durationMs' in source.probe ? Number(source.probe.durationMs) : 0;
    if (!Number.isFinite(duration) || duration <= 0) throw new ClipError('SOURCE_NOT_PROBED');
    let startMs: number, endMs: number;
    try { startMs = parseTimecode(input.startTimecode); endMs = parseTimecode(input.endTimecode); } catch (error) { if (error instanceof ClipEditError) throw new ClipError(error.code); throw error; }
    if (endMs <= startMs) throw new ClipError('CLIP_END_NOT_AFTER_START');
    if (endMs > duration) throw new ClipError('CLIP_OUTSIDE_SOURCE');
    if (endMs - startMs > project.defaultMaxClipSeconds * 1000) throw new ClipError('CLIP_TOO_LONG');
    const words = await this.transcripts.wordsInRange(project.id, startMs, endMs);
    if (!words.length) throw new ClipError('TRANSCRIPT_NOT_FOUND');
    const captionDocument = this.captions.execute({ languageTag: project.languageTag, words, startMs, endMs });
    const clip = await this.clips.createManual({ projectId: project.id, analysisRunId: null, origin: 'MANUAL', startMs, endMs, title: null, rank: null, score: null, captionDocument, style: {}, frame: {}, state: 'CANDIDATE' }, input.idempotencyKey);
    await this.preparation.prepare({ projectWorkflowId: project.activeWorkflowId ?? '', clipId: clip.id, startMs, endMs });
    return { ...clip, selectionCostMicrousd: 0n };
  }
}
