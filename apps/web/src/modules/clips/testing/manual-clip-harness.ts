import { ClipDataService } from '../application/data-services/clip.data-service';
import { AddManualClipService } from '../application/services/add-manual-clip.service';
import type { ClipPreparationPort } from '../application/ports/clip-preparation.port';
import type { TranscriptDocumentPort } from '../application/ports/transcript-document.port';
import type { ProjectEntityDto, SourceAssetEntityDto } from '../../projects/application/dto/entity';
import { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import type { ClipEntityDto } from '../application/dto/entity';
export function manualClipHarness(input: { mode: 'MANUAL' | 'AI_HIGHLIGHTS'; sourceDurationMs: number; maximumClipSeconds: number }) {
  const projectId = '00000000-0000-0000-0000-000000000001'; const project = { id: projectId, name: 'test', mode: input.mode, languageTag: 'en', defaultMaxClipSeconds: input.maximumClipSeconds, defaultPlatformPreset: 'YOUTUBE_SHORTS', status: 'DRAFT', activeWorkflowId: 'workflow', openaiSpendMicrousd: 0n, createdAt: new Date(), updatedAt: new Date() } as ProjectEntityDto;
  const source = { id: 'source', projectId, kind: 'LOCAL_FILE', displayPath: '/tmp/a', resolvedPath: '/tmp/a', objectKey: null, objectVersionId: null, objectSha256: null, sizeBytes: null, modifiedAt: null, fingerprint: null, probe: { durationMs: input.sourceDurationMs }, health: 'HEALTHY', createdAt: new Date(), updatedAt: new Date() } as SourceAssetEntityDto;
  const projects = new ProjectDataService({ get: async () => project } as never); const sources = new SourceAssetDataService({ findByProjectId: async () => source } as never);
  const clips: ClipEntityDto[] = []; const clipStore = new ClipDataService({ createManual: async (v) => { const c = { ...v, id: 'clip', analysisRunId: null, origin: 'MANUAL', title: null, rank: null, score: null, state: 'CANDIDATE', createdAt: new Date(), updatedAt: new Date(), selectionCostMicrousd: 0n } as ClipEntityDto; clips.push(c); return c; } });
  const preparation = { calls: [] as unknown[], prepare: async (v: unknown) => { preparation.calls.push(v); } } as ClipPreparationPort & { calls: unknown[] };
  const transcript: TranscriptDocumentPort = { languageTag: async () => 'en', wordsInRange: async () => [{ text: 'first', startMs: 10000, endMs: 15000 }, { text: 'complete', startMs: 16000, endMs: 22000 }, { text: 'thought', startMs: 23000, endMs: 28000 }] };
  return { projectId, service: new AddManualClipService(projects, sources, transcript, clipStore, preparation), preparation, dependencies: { projects, sources, transcript, clips: clipStore, preparation } };
}
