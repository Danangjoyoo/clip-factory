export interface ClipPreparationPort {
  prepare(input: {
    projectWorkflowId: string;
    clipId: string;
    startMs: number;
    endMs: number;
  }): Promise<void>;
}
