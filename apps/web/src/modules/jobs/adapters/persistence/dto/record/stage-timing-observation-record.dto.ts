export interface StageTimingObservationRecordDto {
  id?: string;
  projectId: string;
  stage: string;
  hardwareKey: string;
  backendKey: string;
  workUnits: bigint;
  durationMs: number;
  throughputMicrounits: bigint;
  createdAt?: Date;
}
