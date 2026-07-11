import { ClipEditApiSchema } from './dto/api/clip-edit-api.dto';
import {
  clipEditApiToEntity,
  clipEditEntityToApi,
} from '../../converters/api-entity/clip-edit.converter';
import {
  UpdateClipEditService,
  type PlatformCatalog,
} from '../../application/services/update-clip-edit.service';
export class ClipEditController {
  constructor(private readonly service: UpdateClipEditService) {}
  async put(request: Request, clipId: string): Promise<Response> {
    const parsed = ClipEditApiSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json({ code: 'INVALID_CLIP_EDIT' }, { status: 422 });
    try {
      return Response.json(
        clipEditEntityToApi(
          await this.service.execute(clipEditApiToEntity(clipId, parsed.data)),
        ),
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('INVALID_'))
        return Response.json({ code: error.message }, { status: 422 });
      throw error;
    }
  }
}
export type { PlatformCatalog };
