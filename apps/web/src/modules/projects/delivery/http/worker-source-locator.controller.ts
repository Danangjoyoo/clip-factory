import { authenticateInternalRequest } from '../../../../shared/delivery/http/internal-auth';
import type { GetWorkerSourceLocatorService } from '../../application/services/get-worker-source-locator.service';
import type { ApplySourceValidationService } from '../../application/services/apply-source-validation.service';
import { SourceValidationInProgressError } from '../../application/services/apply-source-validation.service';
import { WorkerSourceValidationApiSchema } from './dto/api/worker-source-locator-api.dto';
import { createHash } from 'node:crypto';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
    if (!UUID.test(id))
      return Response.json({ code: 'INVALID_SOURCE_ID' }, { status: 422 });
    try {
      const result = await this.getLocator.execute(id);
      return Response.json(result, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Source not ready')
      )
        return Response.json({ code: 'SOURCE_NOT_READY' }, { status: 409 });
      throw error;
    }
  }
  async validate(request: Request, sourceAssetId: string) {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.token,
      )
    )
      return Response.json({ code: 'INTERNAL_UNAUTHORIZED' }, { status: 401 });
    if (!UUID.test(sourceAssetId))
      return Response.json({ code: 'INVALID_SOURCE_ID' }, { status: 422 });
    const parsed = WorkerSourceValidationApiSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json(
        { code: 'INVALID_SOURCE_VALIDATION' },
        { status: 422 },
      );
    const key = request.headers.get('idempotency-key');
    if (
      !key ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      return Response.json(
        { code: 'INVALID_IDEMPOTENCY_KEY' },
        { status: 422 },
      );
    if (parsed.data.sourceAssetId !== sourceAssetId)
      return Response.json(
        { code: 'INVALID_SOURCE_VALIDATION' },
        { status: 422 },
      );
    const requestHash = createHash('sha256')
      .update(JSON.stringify(parsed.data))
      .digest('hex');
    try {
      const result = await this.applyValidation.execute({
        ...parsed.data,
        sizeBytes: BigInt(parsed.data.sizeBytes),
        idempotencyKey: key,
        requestHash,
      });
      return Response.json(result);
    } catch (error) {
      if (error instanceof SourceValidationInProgressError)
        return Response.json(
          { code: 'IDEMPOTENCY_IN_PROGRESS' },
          { status: 409 },
        );
      if (error instanceof Error && error.message === 'idempotency conflict')
        return Response.json({ code: 'IDEMPOTENCY_CONFLICT' }, { status: 409 });
      throw error;
    }
  }
}
