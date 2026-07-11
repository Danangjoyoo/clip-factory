import {
  authenticateInternalRequest,
  INTERNAL_UNAUTHORIZED,
} from '../../../../shared/delivery/http/internal-auth';
import { usageCallbackApiToEntity } from '../../converters/api-entity/usage-callback.converter';
import type { RecordUsageService } from '../../application/services/record-usage.service';
export class UsageCallbackController {
  constructor(
    private readonly service: RecordUsageService,
    private readonly token: string,
  ) {}
  async handle(request: Request, analysisRunId: string) {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.token,
      )
    )
      return Response.json(INTERNAL_UNAUTHORIZED, { status: 401 });
    try {
      const body = await request.json();
      return Response.json(
        await this.service.execute(
          usageCallbackApiToEntity(body, analysisRunId) as any,
        ),
      );
    } catch (error: any) {
      if (
        error?.code === 'PAID_CALL_CONFLICT' ||
        error?.code === 'RESERVATION_OWNERSHIP_CONFLICT'
      )
        return Response.json({ code: error.code }, { status: 409 });
      return Response.json({ code: 'INVALID_USAGE_CALLBACK' }, { status: 422 });
    }
  }
}
