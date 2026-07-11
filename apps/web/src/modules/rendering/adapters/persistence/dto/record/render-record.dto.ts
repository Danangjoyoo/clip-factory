export interface RenderRecordDto {
  renderId: string;
  projectId: string;
  clipId: string;
  inputSnapshotJson: unknown;
  status: string;
  outputObjectKey: string | null;
  srtObjectKey: string | null;
  retryOfRenderId: string | null;
  errorCode: string | null;
}
