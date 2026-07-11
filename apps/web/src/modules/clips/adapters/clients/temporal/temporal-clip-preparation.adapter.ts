import type { ClipPreparationPort } from '../../../application/ports/clip-preparation.port';
export interface ClipPreparationWorkflowClient {
  signalWithStart(
    workflowId: string,
    signal: string,
    payload: unknown,
  ): Promise<void>;
}
export class TemporalClipPreparationAdapter implements ClipPreparationPort {
  constructor(private readonly client: ClipPreparationWorkflowClient) {}
  prepare(input: {
    projectWorkflowId: string;
    clipId: string;
    startMs: number;
    endMs: number;
  }) {
    return this.client.signalWithStart(
      input.projectWorkflowId,
      'prepare_manual_clip',
      { clipId: input.clipId, startMs: input.startMs, endMs: input.endMs },
    );
  }
}
