import type {
  StageTimingObservationRecord,
  StageTimingObservationRepository,
} from '../ports/stage-timing-observation.repository';
export class StageTimingObservationDataService {
  constructor(private readonly repository: StageTimingObservationRepository) {}
  create(record: StageTimingObservationRecord, tx?: unknown) {
    return this.repository.create(record, tx);
  }
  listThroughputs(stage: string, hardwareKey: string, backendKey: string) {
    return this.repository.listThroughputs(stage, hardwareKey, backendKey);
  }
}
