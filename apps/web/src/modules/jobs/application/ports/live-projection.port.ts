import type { ProgressPresentation } from '../../domain/progress';
export interface LiveProjectionPort {
  publish(projectId: string, event: ProgressPresentation): Promise<void>;
  snapshot(projectId: string): Promise<ProgressPresentation | null>;
  events(
    projectId: string,
    afterId: string,
    signal?: AbortSignal,
  ): AsyncIterable<{
    id: string;
    event?: ProgressPresentation;
    comment?: boolean;
  }>;
}
