import type { RenderRepository } from '../ports/render.repository';

export interface DownloadUrlPort {
  presign(objectKey: string, ttlSeconds: number): Promise<string>;
}

export interface GetDownloadResult {
  url: string;
}

export class GetDownloadError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export class GetDownloadService {
  constructor(
    private readonly repository: RenderRepository,
    private readonly downloadUrl: DownloadUrlPort,
  ) {}

  async execute(renderId: string): Promise<GetDownloadResult> {
    const render = await this.repository.findById(renderId);
    if (!render) throw new GetDownloadError('RENDER_NOT_FOUND');
    if (render.status !== 'SUCCEEDED')
      throw new GetDownloadError('RENDER_NOT_READY');
    if (!render.outputKey) throw new GetDownloadError('OUTPUT_NOT_READY');
    const url = await this.downloadUrl.presign(render.outputKey, 300);
    return { url };
  }
}
