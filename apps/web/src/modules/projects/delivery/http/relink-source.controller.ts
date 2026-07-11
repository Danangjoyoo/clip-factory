import { RelinkConfirmationRequiredError, RelinkIncompatibleError, RelinkSourceService } from '../../application/services/relink-source.service';
import { RelinkSourceApiSchema } from './dto/api/relink-source-api.dto';
import { relinkSourceApiToEntity } from '../../converters/api-entity/relink-source.converter';
export class RelinkSourceController {
  constructor(private readonly service: RelinkSourceService) {}
  async post(request: Request, projectId: string) {
    const parsed = RelinkSourceApiSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ code: 'INVALID_RELINK_SOURCE' }, { status: 422 });
    try {
      const candidate = relinkSourceApiToEntity(parsed.data);
      return Response.json(await this.service.execute({ projectId, candidate, ...(parsed.data.confirmedFingerprint ? { confirmedFingerprint: parsed.data.confirmedFingerprint } : {}) }));
    }
    catch (error) {
      if (error instanceof RelinkConfirmationRequiredError) return Response.json({ code: error.code, confirmationRequired: true }, { status: 409 });
      if (error instanceof RelinkIncompatibleError) return Response.json({ code: error.code }, { status: 422 });
      throw error;
    }
  }
}
