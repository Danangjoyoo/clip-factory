export interface RenderRecordDto {
  renderId: string;
  clipId: string;
  snapshotJson: unknown;
  status: string;
  outputKey: string | null;
  errorCode: string | null;
}
