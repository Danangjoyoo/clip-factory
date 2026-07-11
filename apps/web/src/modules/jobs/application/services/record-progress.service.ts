import {
  calculateProgress,
  type ProgressCalculationInput,
  type ProgressPresentation,
} from '../../domain/progress';
import type { LiveProjectionPort } from '../ports/live-projection.port';
import { StageTimingObservationDataService } from '../data-services/stage-timing-observation.data-service';
export interface ProgressProjectionRepository {
  upsert(event: ProgressPresentation): Promise<void>;
  findActive(projectId: string): Promise<ProgressPresentation[]>;
}
export class RecordProgressService {
  constructor(
    private readonly projections: ProgressProjectionRepository,
    private readonly timings: StageTimingObservationDataService,
    private readonly live: LiveProjectionPort,
  ) {}
  async execute(
    input: ProgressCalculationInput & {
      terminal?: boolean;
      hardwareKey?: string;
      backendKey?: string;
      durationMs?: number;
    },
  ) {
    const event = calculateProgress(input);
    await this.projections.upsert(event);
    if (input.terminal && input.durationMs && input.durationMs > 0)
      await this.timings.create({
        projectId: input.projectId,
        stage: input.stage,
        hardwareKey: input.hardwareKey ?? 'unknown',
        backendKey: input.backendKey ?? 'unknown',
        workUnits: BigInt(input.totalUnits),
        durationMs: input.durationMs,
        throughputMicrounits: BigInt(
          Math.floor((input.totalUnits * 1_000_000) / input.durationMs),
        ),
      });
    await this.live.publish(input.projectId, event);
    return event;
  }
}
