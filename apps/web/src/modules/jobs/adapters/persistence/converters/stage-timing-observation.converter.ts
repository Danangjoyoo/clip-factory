import type { StageTimingObservationRecordDto } from '../dto/record/stage-timing-observation-record.dto';
import type { StageTimingObservationRecord } from '../../../application/ports/stage-timing-observation.repository';
export const toStageTimingRecord = (
  r: StageTimingObservationRecordDto,
): StageTimingObservationRecord => ({
  projectId: r.projectId,
  stage: r.stage,
  hardwareKey: r.hardwareKey,
  backendKey: r.backendKey,
  workUnits: r.workUnits,
  durationMs: r.durationMs,
  throughputMicrounits: r.throughputMicrounits,
});
