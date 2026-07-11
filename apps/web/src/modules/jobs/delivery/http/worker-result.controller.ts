import { createHash } from 'node:crypto';
import {
  authenticateInternalRequest,
  INTERNAL_UNAUTHORIZED,
} from '../../../../shared/delivery/http/internal-auth';
import { WorkerResultApiSchema } from './dto/api/worker-result-api.dto';
import { workerResultApiToEntity } from '../../converters/api-entity/worker-result.converter';
import type { ApplyWorkerResultService } from '../../application/services/apply-worker-result.service';
import { IdempotencyConflictError } from '../../application/services/apply-worker-result.service';
export class WorkerResultController {
  constructor(
    private readonly service: ApplyWorkerResultService,
    private readonly token: string,
  ) {}
  async apply(request: Request, workflowId: string) {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.token,
      )
    )
      return Response.json(INTERNAL_UNAUTHORIZED, { status: 401 });
    const key = request.headers.get('idempotency-key');
    if (!key)
      return Response.json(
        { code: 'INVALID_IDEMPOTENCY_KEY' },
        { status: 422 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ code: 'INVALID_WORKER_RESULT' }, { status: 422 });
    }
    const parsed = WorkerResultApiSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ code: 'INVALID_WORKER_RESULT' }, { status: 422 });
    const hash = createHash('sha256')
      .update(JSON.stringify(parsed.data))
      .digest('hex');
    try {
      return Response.json(
        await this.service.execute(
          workerResultApiToEntity(parsed.data, workflowId, key, hash),
        ),
      );
    } catch (error) {
      if (error instanceof IdempotencyConflictError)
        return Response.json({ code: 'IDEMPOTENCY_CONFLICT' }, { status: 409 });
      throw error;
    }
  }
}
