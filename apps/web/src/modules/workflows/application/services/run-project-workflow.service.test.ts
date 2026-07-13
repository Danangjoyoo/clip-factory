import { describe, expect, it, vi } from 'vitest';
import { RunProjectWorkflowService } from './run-project-workflow.service';

const project = {
  id: 'project-1',
  name: 'Branding',
  mode: 'MANUAL' as const,
  languageTag: 'en',
  defaultMaxClipSeconds: 60,
  source: {
    id: 'source-1',
    kind: 'LOCAL_FILE' as const,
    displayPath: '/videos/branding.mp4',
    health: 'UNKNOWN' as const,
  },
  completedClipIds: [],
};

describe('RunProjectWorkflowService', () => {
  it('runs source validation through local render completion', async () => {
    const stages: string[] = [];
    const transcript = {
      text: 'Branding makes a promise memorable.',
      words: [
        { text: 'Branding', startMs: 0, endMs: 600 },
        { text: 'makes', startMs: 700, endMs: 1000 },
      ],
      durationMs: 60_000,
      runtimeMs: 10,
      backend: 'MLX_WHISPER' as const,
      model: 'mlx-community/whisper-large-v3-mlx',
      modelRevision: '49e6aa286ad60c14352c404340ded53710378a11',
      weightsSha256:
        '05ff791ce3630fae47e7c51004e9666204d786246ec07cac6110af768099b40d',
      objectBucket: 'clip-factory',
      objectKey: 'projects/project-1/transcripts/transcript.v1.json',
      objectVersionId: 'v1',
      objectSha256:
        '1111111111111111111111111111111111111111111111111111111111111111',
    };
    const store = {
      loadProject: vi.fn().mockResolvedValue(project),
      markStage: vi.fn(async (_projectId, stage) => {
        stages.push(stage);
      }),
      saveTranscript: vi.fn().mockResolvedValue(undefined),
      saveLocalRenders: vi.fn().mockResolvedValue([]),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn(),
    };
    const transcriber = {
      transcribe: vi.fn().mockResolvedValue(transcript),
    };

    const result = await new RunProjectWorkflowService(
      store,
      transcriber,
    ).execute('project-1');

    expect(stages).toEqual([
      'VALIDATING_SOURCE',
      'TRANSCRIBING',
      'GENERATING_PREVIEWS',
      'COMPLETED',
    ]);
    expect(store.saveLocalRenders).toHaveBeenCalledWith(project, []);
    expect(result).toMatchObject({
      projectId: 'project-1',
      status: 'COMPLETED',
      clipIds: [],
      renderIds: [],
      editorHref: '/projects/project-1/editor',
      resultsHref: '/projects/project-1/clips',
    });
  });

  it('returns completed projects without duplicate transcription', async () => {
    const store = {
      loadProject: vi
        .fn()
        .mockResolvedValue({ ...project, completedClipIds: ['clip-1'] }),
      markStage: vi.fn(),
      saveTranscript: vi.fn(),
      saveLocalRenders: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn(),
    };

    const result = await new RunProjectWorkflowService(
      store,
      { transcribe: vi.fn() },
    ).execute('project-1');

    expect(result).toMatchObject({
      status: 'COMPLETED',
      clipIds: ['clip-1'],
      editorHref: '/projects/project-1/editor',
    });
  });
});
