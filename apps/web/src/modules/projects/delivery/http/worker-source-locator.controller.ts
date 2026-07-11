import { authenticateInternalRequest } from '../../../../shared/delivery/http/internal-auth';
import type { GetWorkerSourceLocatorService } from '../../application/services/get-worker-source-locator.service';
import type { ApplySourceValidationService } from '../../application/services/apply-source-validation.service';
import { WorkerSourceValidationApiSchema } from './dto/api/worker-source-locator-api.dto';
export class WorkerSourceLocatorController {
  constructor(
    private readonly getLocator: GetWorkerSourceLocatorService,
    private readonly applyValidation: ApplySourceValidationService,
    private readonly token: string,
  ) {}
  async get(request: Request, id: string) {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.token,
      )
    )
      return Response.json({ code: 'INTERNAL_UNAUTHORIZED' }, { status: 401 });
    try {
      const result = await this.getLocator.execute(id);
      return Response.json(result, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch {
      return Response.json({ code: 'SOURCE_NOT_READY' }, { status: 409 });
    }
  }
  async validate(request: Request) {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.token,
      )
    )
      return Response.json({ code: 'INTERNAL_UNAUTHORIZED' }, { status: 401 });
    const parsed = WorkerSourceValidationApiSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json(
        { code: 'INVALID_SOURCE_VALIDATION' },
        { status: 422 },
      );
    const result = await this.applyValidation.execute({
      ...parsed.data,
      sizeBytes: BigInt(parsed.data.sizeBytes),
      idempotencyKey: request.headers.get('idempotency-key') ?? '',
      requestHash: '',
    });
    return Response.json(result);
  }
}
