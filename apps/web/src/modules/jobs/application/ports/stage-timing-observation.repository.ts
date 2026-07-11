export interface StageTimingObservationRecord {
  projectId: string;
  stage: string;
  hardwareKey: string;
  backendKey: string;
  workUnits: bigint;
  durationMs: number;
  throughputMicrounits: bigint;
}
export interface StageTimingObservationRepository {
  create(record: StageTimingObservationRecord, tx?: unknown): Promise<void>;
  listThroughputs(
    stage: string,
    hardwareKey: string,
    backendKey: string,
  ): Promise<number[]>;
}
