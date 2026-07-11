import { AddClipApiSchema } from './dto/api/add-clip-api.dto';
import {
  addClipApiToEntity,
  clipEntityToApi,
} from '../../converters/api-entity/add-clip.converter';
import type { AddManualClipService } from '../../application/services/add-manual-clip.service';
export class ClipController {
  constructor(private readonly service: AddManualClipService) {}
  async post(request: Request, projectId: string): Promise<Response> {
    const parsed = AddClipApiSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json({ code: 'INVALID_CLIP_INPUT' }, { status: 422 });
    try {
      return Response.json(
        clipEntityToApi(
          await this.service.execute(
            addClipApiToEntity(
              projectId,
              parsed.data,
              request.headers.get('idempotency-key') ?? undefined,
            ),
          ),
        ),
        { status: 201 },
      );
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? String((error as { code: string }).code)
          : '';
      const status =
        code === 'PROJECT_NOT_FOUND' || code === 'SOURCE_NOT_FOUND'
          ? 404
          : code
            ? 422
            : 500;
      return Response.json({ code: code || 'CLIP_FAILED' }, { status });
    }
  }
}
