export type WorkflowStage =
  | 'VALIDATING_SOURCE'
  | 'TRANSCRIBING'
  | 'GENERATING_PREVIEWS'
  | 'COMPLETED'
  | 'FAILED';

export type WorkflowProject = {
  id: string;
  name: string;
  mode: 'AI_HIGHLIGHTS' | 'MANUAL';
  languageTag: string;
  defaultMaxClipSeconds: number;
  source: {
    id: string;
    kind: 'LOCAL_FILE' | 'BROWSER_UPLOAD';
    displayPath: string;
    health: string;
    objectKey?: string | null;
    objectSha256?: string | null;
  } | null;
  completedClipIds: readonly string[];
};

export type WorkflowTranscript = {
  text: string;
  words: readonly { text: string; startMs: number; endMs: number }[];
  durationMs: number;
  runtimeMs: number;
  backend: 'MLX_WHISPER';
  model: string;
  modelRevision: string;
  weightsSha256: string;
  objectBucket: string;
  objectKey: string;
  objectVersionId: string | null;
  objectSha256: string;
};

export type WorkflowResult = {
  projectId: string;
  status: 'COMPLETED' | 'FAILED';
  clipIds: readonly string[];
  renderIds: readonly string[];
  editorHref: string;
  resultsHref: string;
  error?: string;
};

export interface ProjectWorkflowStore {
  loadProject(projectId: string): Promise<WorkflowProject | null>;
  markStage(projectId: string, stage: WorkflowStage): Promise<void>;
  saveTranscript(
    project: WorkflowProject,
    transcript: WorkflowTranscript,
  ): Promise<void>;
  saveLocalRenders(
    project: WorkflowProject,
    clipIds: readonly string[],
  ): Promise<readonly string[]>;
  complete(projectId: string): Promise<void>;
  fail(projectId: string, error: string): Promise<void>;
}

export interface ProjectTranscriber {
  transcribe(project: WorkflowProject): Promise<WorkflowTranscript>;
}

export class RunProjectWorkflowService {
  constructor(
    private readonly store: ProjectWorkflowStore,
    private readonly transcriber: ProjectTranscriber,
  ) {}

  async execute(projectId: string): Promise<WorkflowResult> {
    const project = await this.store.loadProject(projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    const hrefs = {
      editorHref: `/projects/${project.id}/editor`,
      resultsHref: `/projects/${project.id}/clips`,
    };
    if (project.completedClipIds.length)
      return {
        projectId: project.id,
        status: 'COMPLETED',
        clipIds: project.completedClipIds,
        renderIds: [],
        ...hrefs,
      };

    try {
      await this.store.markStage(project.id, 'VALIDATING_SOURCE');
      if (!project.source) throw new Error('SOURCE_NOT_FOUND');

      await this.store.markStage(project.id, 'TRANSCRIBING');
      const transcript = await this.transcriber.transcribe(project);
      await this.store.saveTranscript(project, transcript);

      let clipIds: readonly string[] = [];

      await this.store.markStage(project.id, 'GENERATING_PREVIEWS');
      const renderIds = await this.store.saveLocalRenders(project, clipIds);
      await this.store.markStage(project.id, 'COMPLETED');
      await this.store.complete(project.id);

      return {
        projectId: project.id,
        status: 'COMPLETED',
        clipIds,
        renderIds,
        ...hrefs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WORKFLOW_FAILED';
      await this.store.markStage(project.id, 'FAILED');
      await this.store.fail(project.id, message);
      return {
        projectId: project.id,
        status: 'FAILED',
        clipIds: [],
        renderIds: [],
        error: message,
        ...hrefs,
      };
    }
  }
}
