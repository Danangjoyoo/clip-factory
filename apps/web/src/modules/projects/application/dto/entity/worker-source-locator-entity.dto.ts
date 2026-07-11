export type WorkerSourceLocatorEntityDto =
  | { kind: 'LOCAL_FILE'; candidatePath: string }
  | {
      kind: 'BROWSER_UPLOAD';
      objectReference: {
        bucket: string;
        key: string;
        versionId: string | null;
      };
    };
export interface ApplySourceValidationCommand {
  sourceAssetId: string;
  kind: 'LOCAL_FILE';
  resolvedPath: string;
  sizeBytes: bigint;
  modifiedAt: string;
  fingerprint: string;
  probe: unknown;
  idempotencyKey: string;
  requestHash: string;
}
export interface SourceValidationAcknowledgement {
  sourceAssetId: string;
  health: string;
  fingerprint: string;
}
