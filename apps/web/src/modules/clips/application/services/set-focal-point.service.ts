import type { FrameConfigurationEntityDto } from '../dto/entity/frame-configuration-entity.dto';
import type { ClipPreparationPort } from '../ports/clip-preparation.port';

export interface FrameConfigurationStore {
  get(clipId: string): Promise<FrameConfigurationEntityDto | null>;
  save(configuration: FrameConfigurationEntityDto): Promise<void>;
}

export class SetFocalPointService {
  constructor(
    private readonly store: FrameConfigurationStore,
    private readonly preparation: ClipPreparationPort,
  ) {}
  async execute(input: {
    projectWorkflowId: string;
    clipId: string;
    startMs: number;
    endMs: number;
    xMicros: number;
    yMicros: number;
  }): Promise<FrameConfigurationEntityDto> {
    if (
      ![input.xMicros, input.yMicros].every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 1_000_000,
      )
    )
      throw new Error('INVALID_FOCAL_POINT');
    const current = await this.store.get(input.clipId);
    if (!current) throw new Error('FRAME_CONFIGURATION_NOT_FOUND');
    const updated = {
      ...current,
      manualFocalPoint: { xMicros: input.xMicros, yMicros: input.yMicros },
    };
    await this.store.save(updated);
    await this.preparation.prepare({
      projectWorkflowId: input.projectWorkflowId,
      clipId: input.clipId,
      startMs: input.startMs,
      endMs: input.endMs,
    });
    return updated;
  }
}
