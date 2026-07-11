import { AddClipApiSchema } from './dto/api/add-clip-api.dto';
import { addClipApiToEntity, clipEntityToApi } from '../../converters/api-entity/add-clip.converter';
import type { AddManualClipService } from '../../application/services/add-manual-clip.service';
export class ClipController {
  constructor(private readonly service: AddManualClipService) {}
  async post(request: Request, projectId: string) {
    const parsed = AddClipApiSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ code: 'INVALID_CLIP_RANGE' }, { status: 422 });
    const key = request.headers.get('idempotency-key') ?? undefined;
    if (!key) return Response.json({ code: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 422 });
    try { return Response.json(clipEntityToApi(await this.service.execute(addClipApiToEntity(projectId, parsed.data, key))), { status: 201 }); }
    catch (error) { const code = error instanceof Error ? error.message : 'CLIP_FAILED'; const status = code === 'PROJECT_NOT_FOUND' || code === 'SOURCE_NOT_FOUND' ? 404 : code === 'CLIP_END_NOT_AFTER_START' || code === 'CLIP_OUTSIDE_SOURCE' || code === 'CLIP_TOO_LONG' || code.startsWith('INVALID_') ? 422 : 409; return Response.json({ code }, { status }); }
  }
}
