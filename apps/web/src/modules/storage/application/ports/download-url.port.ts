export interface DownloadUrlPort {
  presign(key: string, expiresSeconds?: number): Promise<string>;
}
