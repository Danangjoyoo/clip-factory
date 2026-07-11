import type { GetDownloadService } from '../../application/services/get-download.service';
import { GetDownloadError } from '../../application/services/get-download.service';

export class DownloadController {
  constructor(private readonly service: GetDownloadService) {}

  async get(renderId: string) {
    try {
      const result = await this.service.execute(renderId);
      return Response.json(result, { status: 200 });
    } catch (error) {
      if (error instanceof GetDownloadError) {
        return Response.json({ code: error.code }, { status: this._status(error.code) });
      }
      throw error;
    }
  }

  private _status(code: string): number {
    if (code === 'RENDER_NOT_FOUND') return 404;
    if (code === 'RENDER_NOT_READY' || code === 'OUTPUT_NOT_READY') return 409;
    return 400;
  }
}
