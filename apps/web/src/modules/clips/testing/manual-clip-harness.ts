import type { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import type { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import type { ClipPreparationPort } from '../application/ports/clip-preparation.port';
import { ClipDataService } from '../application/data-services/clip.data-service';
import type { ClipEntityDto, ClipMode } from '../application/dto/entity';
import type { TranscriptDocumentPort } from '../application/ports/transcript-document.port';
import { AddManualClipService } from '../application/services/add-manual-clip.service';

export function manualClipHarness(input: {
  mode: ClipMode;
  sourceDurationMs: number;
  maximumClipSeconds: number;
}) {
  const projectId = '00000000-0000-4000-8000-000000000001';
  const project = {
    id: projectId,
    name: 'test',
    mode: input.mode,
    languageTag: 'en',
    defaultMaxClipSeconds: input.maximumClipSeconds,
    defaultPlatformPreset: 'YOUTUBE_SHORTS' as const,
    status: 'DRAFT' as const,
    activeWorkflowId: 'workflow',
    openaiSpendMicrousd: 0n,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const projects = {
    get: async () => project,
  } as unknown as ProjectDataService;
  const sources = {
    getByProjectId: async () => ({
      id: 'source',
      projectId,
      kind: 'LOCAL_FILE',
      displayPath: '/tmp/video.mp4',
      resolvedPath: '/tmp/video.mp4',
      objectKey: null,
      objectVersionId: null,
      objectSha256: null,
      sizeBytes: null,
      modifiedAt: null,
      fingerprint: null,
      probe: { durationMs: input.sourceDurationMs },
      health: 'HEALTHY',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }),
  } as unknown as SourceAssetDataService;
  const transcripts: TranscriptDocumentPort = {
    wordsInRange: async () => [
      { text: 'first', startMs: 10000, endMs: 12000 },
      { text: 'complete', startMs: 20000, endMs: 22000 },
      { text: 'thought', startMs: 30000, endMs: 32000 },
    ],
  };
  let sequence = 0;
  const clips = new ClipDataService({
    createManual: async (value) => ({
      ...value,
      id: `clip-${++sequence}`,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      selectionCostMicrousd: 0n,
    }),
  });
  const preparation: ClipPreparationPort & {
    calls: Array<{ clipId: string; startMs: number; endMs: number }>;
  } = {
    calls: [],
    prepare: async (value) => {
      preparation.calls.push({
        clipId: value.clipId,
        startMs: value.startMs,
        endMs: value.endMs,
      });
    },
  };
  return {
    projectId,
    service: new AddManualClipService(
      projects,
      sources,
      transcripts,
      clips,
      preparation,
    ),
    preparation,
    dependencies: { projects, sources, transcripts, clips, preparation },
  };
}
