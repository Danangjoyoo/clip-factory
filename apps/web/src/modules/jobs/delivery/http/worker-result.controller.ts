import { createHash } from 'node:crypto';
import {
  authenticateInternalRequest,
  INTERNAL_UNAUTHORIZED,
} from '../../../../shared/delivery/http/internal-auth';
import { WorkerResultApiSchema } from './dto/api/worker-result-api.dto';
import { workerResultApiToEntity } from '../../converters/api-entity/worker-result.converter';
import type { ApplyWorkerResultService } from '../../application/services/apply-worker-result.service';
import {
  IdempotencyConflictError,
  PaidCallUncertainError,
} from '../../application/services/apply-worker-result.service';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTIFACT_BUCKET = 'clip-factory';
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
    if (!UUID.test(workflowId))
      return Response.json({ code: 'INVALID_WORKFLOW_ID' }, { status: 422 });
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ code: 'INVALID_WORKER_RESULT' }, { status: 422 });
    }
    const parsed = WorkerResultApiSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ code: 'INVALID_WORKER_RESULT' }, { status: 422 });
    if (
      parsed.data.transcriptObject &&
      (parsed.data.transcriptObject.bucket !== ARTIFACT_BUCKET ||
        !parsed.data.transcriptObject.key.startsWith(
          `projects/${parsed.data.projectId}/`,
        ))
    )
      return Response.json(
        { code: 'INVALID_OBJECT_REFERENCE' },
        { status: 422 },
      );
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
      if (error instanceof PaidCallUncertainError)
        return Response.json(
          { code: 'PAID_CALL_UNCERTAIN_ACK_REQUIRED' },
          { status: 409 },
        );
      throw error;
    }
  }
}
