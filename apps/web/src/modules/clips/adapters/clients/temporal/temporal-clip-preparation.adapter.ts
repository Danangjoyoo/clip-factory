import type { ClipPreparationPort } from '../../../application/ports/clip-preparation.port';
export class TemporalClipPreparationAdapter implements ClipPreparationPort {
  constructor(private readonly start: (workflowId: string, input: unknown) => Promise<void>) {}
  prepare(input: { projectWorkflowId: string; clipId: string; startMs: number; endMs: number }) { return this.start(input.projectWorkflowId, { type: 'prepare_manual_clip', clipId: input.clipId, startMs: input.startMs, endMs: input.endMs }); }
}
