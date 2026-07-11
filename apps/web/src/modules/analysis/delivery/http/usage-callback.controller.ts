import {
  authenticateInternalRequest,
  INTERNAL_UNAUTHORIZED,
} from '../../../../shared/delivery/http/internal-auth';
import { usageCallbackApiToEntity } from '../../converters/api-entity/usage-callback.converter';
import type { RecordUsageService } from '../../application/services/record-usage.service';
import { z } from 'zod';
import type { UsageCallbackApiDto } from './dto/api/usage-callback-api.dto';
import { usageEventEntityToApi } from '../../converters/entity-api/usage-event.converter';
const callbackSchema = z.object({
  callId: z.string().min(1), projectId: z.string().min(1), providerResponseId: z.string().min(1), requestHash: z.string().min(1), modelId: z.string().min(1), reasoning: z.string().min(1), promptVersion: z.string().min(1), schemaVersion: z.string().min(1), pricingVersion: z.string().min(1), purpose: z.string().min(1), pricingTier: z.string().min(1), inputTokens: z.number().int().nonnegative(), cachedInputTokens: z.number().int().nonnegative().optional(), cacheWriteInputTokens: z.number().int().nonnegative().optional(), outputTokens: z.number().int().nonnegative(), reasoningTokens: z.number().int().nonnegative().optional(), occurredAt: z.string().datetime(), clipId: z.string().min(1).nullable().optional(), responseObjectReference: z.object({ bucket: z.string().min(1), key: z.string().min(1), versionId: z.string().nullable().optional(), sha256: z.string().min(1) }).nullable().optional(),
}).strict();
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
      const body = callbackSchema.parse(await request.json()) as UsageCallbackApiDto;
      return Response.json(
        usageEventEntityToApi(
          await this.service.execute(
            usageCallbackApiToEntity(body, analysisRunId),
          ),
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
