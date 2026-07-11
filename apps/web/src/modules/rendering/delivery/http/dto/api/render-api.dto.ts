export interface RenderApiDto {
  renderId: string;
  status: string;
  outputKey: string | null;
  srtObjectKey: string | null;
  retryOfRenderId: string | null;
  errorCode: string | null;
}
