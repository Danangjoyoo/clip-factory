import type { ProjectDataService } from '../../../projects/application/data-services/project.data-service';
import type { SourceAssetDataService } from '../../../projects/application/data-services/source-asset.data-service';
import type { AddManualClipEntityRequest, ClipEntityDto } from '../dto/entity';
import type { ClipPreparationPort } from '../ports/clip-preparation.port';
import type { TranscriptDocumentPort } from '../ports/transcript-document.port';
import { BuildCaptionDocumentService } from './build-caption-document.service';
import { parseTimecode } from '../../domain/timecode';
import { randomUUID } from 'node:crypto';

export class AddManualClipService {
  constructor(private readonly projects: ProjectDataService, private readonly sources: SourceAssetDataService, private readonly transcripts: TranscriptDocumentPort, private readonly clips: import('../data-services/clip.data-service').ClipDataService, private readonly preparation: ClipPreparationPort, private readonly captions = new BuildCaptionDocumentService({ next: randomUUID })) {}
  async execute(input: AddManualClipEntityRequest): Promise<ClipEntityDto> {
    const project = await this.projects.get(input.projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    const source = await this.sources.getByProjectId(project.id);
    if (!source) throw new Error('SOURCE_NOT_FOUND');
    const probe = source.probe as { durationMs?: unknown } | null;
    const durationMs = typeof probe?.durationMs === 'number' ? probe.durationMs : null;
    if (durationMs === null) throw new Error('SOURCE_NOT_PROBED');
    let startMs: number, endMs: number;
    try { startMs = parseTimecode(input.startTimecode); endMs = parseTimecode(input.endTimecode); } catch { throw new Error('INVALID_TIMECODE'); }
    if (endMs <= startMs) throw new Error('CLIP_END_NOT_AFTER_START');
    if (endMs > durationMs) throw new Error('CLIP_OUTSIDE_SOURCE');
    if (endMs - startMs > project.defaultMaxClipSeconds * 1000) throw new Error('CLIP_TOO_LONG');
    const words = await this.transcripts.wordsInRange(project.id, startMs, endMs);
    const captionDocument = this.captions.execute({ languageTag: await this.transcripts.languageTag(project.id), words, startMs, endMs });
    const clip = await this.clips.createManual({ projectId: project.id, startMs, endMs, captionDocument });
    if (!project.activeWorkflowId) throw new Error('WORKFLOW_NOT_ACTIVE');
    await this.preparation.prepare({ projectWorkflowId: project.activeWorkflowId, clipId: clip.id, startMs, endMs });
    return { ...clip, analysisRunId: null, rank: null, score: null, selectionCostMicrousd: 0n };
  }
}
