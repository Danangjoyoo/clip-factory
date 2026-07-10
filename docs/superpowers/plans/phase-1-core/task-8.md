# Task 8: Authenticate and Deduplicate Internal Worker Callbacks

> **For agentic workers:** Use superpowers:test-driven-development and write-typescript-controller-layer. The duplicate-terminal-result test must fail before callback code exists.

## Purpose and traceability

Implement design §§8, 22–24: a worker-only authenticated boundary that validates versioned references, requires idempotency keys, and cannot apply a terminal result twice.

## Layers and owned boundaries

- Delivery owns bearer-token parsing, request validation, status mapping, and API DTOs.
- Application owns idempotency decision and terminal-state invariants through `ApplyWorkerResultService`.
- `IdempotencyReceiptDataService` imports only `IdempotencyReceiptRepository`; `JobProjectionDataService` imports only `JobProjectionRepository`.
- Contract/API payload converts to Entity command; Temporal/Pydantic or Prisma types never leak inward.

## Exact files

- Create: `apps/web/src/modules/jobs/application/dto/entity/job-projection-entity.dto.ts`
- Create: `apps/web/src/modules/jobs/application/dto/entity/stage-timing-observation-entity.dto.ts`
- Create: `apps/web/src/modules/jobs/application/dto/entity/idempotency-receipt-entity.dto.ts`
- Create: `apps/web/src/modules/jobs/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/jobs/application/ports/job-projection.repository.ts`
- Create: `apps/web/src/modules/jobs/application/ports/idempotency-receipt.repository.ts`
- Create: `apps/web/src/modules/jobs/application/ports/project-terminal.port.ts`
- Create: `apps/web/src/modules/jobs/application/ports/unit-of-work.port.ts`
- Create: `apps/web/src/modules/jobs/application/data-services/job-projection.data-service.ts`
- Create: `apps/web/src/modules/jobs/application/data-services/idempotency-receipt.data-service.ts`
- Create: `apps/web/src/modules/jobs/application/services/apply-worker-result.service.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/dto/record/job-projection-record.dto.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/dto/record/idempotency-receipt-record.dto.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/repositories/prisma-job-projection.repository.ts`
- Create: `apps/web/src/modules/jobs/adapters/persistence/repositories/prisma-idempotency-receipt.repository.ts`
- Create: `apps/web/src/modules/jobs/converters/entity-record/job-projection.converter.ts`
- Create: `apps/web/src/modules/jobs/converters/entity-record/idempotency-receipt.converter.ts`
- Create: `apps/web/src/modules/jobs/delivery/http/dto/api/worker-result-api.dto.ts`
- Create: `apps/web/src/modules/jobs/converters/api-entity/worker-result.converter.ts`
- Create: `apps/web/src/shared/delivery/http/internal-auth.ts`
- Create: `apps/web/src/modules/jobs/delivery/http/worker-result.controller.ts`
- Create: `apps/web/src/modules/jobs/composition/jobs.composition.ts`
- Create: `apps/web/src/modules/jobs/testing/job-service-harness.ts`
- Create: `apps/web/src/modules/projects/application/dto/entity/worker-source-locator-entity.dto.ts`
- Create: `apps/web/src/modules/projects/application/services/get-worker-source-locator.service.ts`
- Create: `apps/web/src/modules/projects/application/services/apply-source-validation.service.ts`
- Create: `apps/web/src/modules/projects/delivery/http/dto/api/worker-source-locator-api.dto.ts`
- Create: `apps/web/src/modules/projects/converters/api-entity/worker-source-locator.converter.ts`
- Create: `apps/web/src/modules/projects/delivery/http/worker-source-locator.controller.ts`
- Test: `apps/web/src/modules/projects/application/services/get-worker-source-locator.service.test.ts`
- Test: `apps/web/src/modules/projects/application/services/apply-source-validation.service.test.ts`
- Test: `apps/web/src/modules/projects/converters/api-entity/worker-source-locator.converter.test.ts`
- Test: `apps/web/src/modules/projects/delivery/http/worker-source-locator.controller.test.ts`
- Test: `apps/web/src/shared/delivery/http/internal-auth.test.ts`
- Test: `apps/web/src/modules/jobs/application/services/apply-worker-result.service.test.ts`
- Test: `apps/web/src/modules/jobs/converters/api-entity/worker-result.converter.test.ts`
- Test: `apps/web/src/modules/jobs/converters/entity-record/job-projection.converter.test.ts`
- Test: `apps/web/src/modules/jobs/delivery/http/worker-result.controller.test.ts`
- Create: `apps/web/src/app/api/internal/v1/workflows/[workflowId]/result/route.ts`, `apps/web/src/app/api/internal/v1/workflows/[workflowId]/progress/route.ts`, `apps/web/src/app/api/internal/v1/worker/heartbeat/route.ts`
- Create: `apps/web/src/app/api/internal/v1/sources/[sourceAssetId]/locator/route.ts`, `apps/web/src/app/api/internal/v1/sources/[sourceAssetId]/validation/route.ts`
- Create: `tests/integration/internal-worker-callback.test.ts`
- Modify: `apps/web/src/config/server-env.ts`

## Prerequisites and interfaces

- Requires Tasks 5–7.
- Headers: `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>` and `Idempotency-Key: <uuid>`.
- `ApplyWorkerResultCommand` contains `workflowId`, `projectId`, `status`, artifact references, error, `completedAt`, `idempotencyKey`, and SHA-256 `requestHash`.
- `GetWorkerSourceLocatorService.execute(sourceAssetId)` returns the internal-only union `{kind:'LOCAL_FILE'; candidatePath}` or `{kind:'BROWSER_UPLOAD'; objectReference}`. No public converter exposes either locator.
- `ApplySourceValidationService.execute(command)` accepts the resolved local path only on its authenticated internal command, persists validation atomically, and returns a path-free acknowledgement. Neither locator endpoint writes request/response bodies to logs.

## RED → GREEN → REFACTOR

- [ ] **RED: write authentication timing-safe comparison behavior.**

```ts
// apps/web/src/shared/delivery/http/internal-auth.test.ts
import { expect, it } from 'vitest';
import { authenticateInternalRequest } from './internal-auth';

it('accepts only the exact bearer service credential', () => {
  expect(authenticateInternalRequest('Bearer worker-local-token', 'worker-local-token')).toBe(true);
  expect(authenticateInternalRequest('Bearer worker-local-token-x', 'worker-local-token')).toBe(false);
  expect(authenticateInternalRequest(null, 'worker-local-token')).toBe(false);
});
```

- [ ] Run `pnpm exec vitest run apps/web/src/shared/delivery/http/internal-auth.test.ts`; expect import FAIL.

- [ ] **GREEN: create timing-safe authentication.**

```ts
import { timingSafeEqual } from 'node:crypto';
export function authenticateInternalRequest(header: string|null, expected: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const actualBuffer = Buffer.from(header.slice(7));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
export const INTERNAL_UNAUTHORIZED = { code:'INTERNAL_UNAUTHORIZED', message:'Internal service authentication failed' } as const;
```

- [ ] Run auth test; expect PASS.

- [ ] **RED: prove the private locator lifecycle without Temporal/path leakage.**

```ts
it('returns a pending submitted path internally and persists a path-free validation acknowledgement', async () => {
  const harness = makeSourceLocatorHarness({kind:'LOCAL_FILE',displayPath:'/Users/me/Videos/interview.mov',resolvedPath:null,health:'UNKNOWN'});
  await expect(harness.getLocator.execute(SOURCE_ID)).resolves.toEqual({kind:'LOCAL_FILE',candidatePath:'/Users/me/Videos/interview.mov'});
  const acknowledgement = await harness.applyValidation.execute({sourceAssetId:SOURCE_ID,kind:'LOCAL_FILE',resolvedPath:'/Users/me/Videos/interview.mov',sizeBytes:4096n,modifiedAt:'2026-07-11T00:00:00Z',fingerprint:'a'.repeat(64),probe:validProbe(),idempotencyKey:IDEMPOTENCY_KEY,requestHash:'b'.repeat(64)});
  expect(acknowledgement).toEqual({sourceAssetId:SOURCE_ID,health:'LOCATED',fingerprint:'a'.repeat(64)});
  expect(JSON.stringify(acknowledgement)).not.toContain('/Users/');
});

it('never writes locator request or response bodies to the internal logger', async () => {
  const {controller,logger}=makeSourceLocatorControllerHarness();
  await controller.get(internalRequest(), SOURCE_ID);
  expect(logger.records).toEqual([{event:'worker_source_locator_read',sourceAssetId:SOURCE_ID,status:200}]);
  expect(JSON.stringify(logger.records)).not.toContain('/Users/');
});
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/projects/application/services/{get-worker-source-locator,apply-source-validation}.service.test.ts apps/web/src/modules/projects/delivery/http/worker-source-locator.controller.test.ts`; expect import FAIL for the two services.

- [ ] **GREEN: add closed internal locator read/update delivery.**

```ts
export class GetWorkerSourceLocatorService {
  constructor(private readonly sources: SourceAssetDataService) {}
  async execute(sourceAssetId: string): Promise<WorkerSourceLocatorEntityDto> {
    const source=await this.sources.requireById(sourceAssetId);
    if (source.kind==='LOCAL_FILE') return {kind:'LOCAL_FILE',candidatePath:source.resolvedPath ?? source.displayPath};
    if (!source.objectReference) throw new SourceNotReadyError(sourceAssetId);
    return {kind:'BROWSER_UPLOAD',objectReference:source.objectReference};
  }
}

export class ApplySourceValidationService {
  constructor(private readonly unitOfWork: UnitOfWork, private readonly sources: SourceAssetDataService, private readonly receipts: IdempotencyReceiptDataService) {}
  execute(command: ApplySourceValidationCommand): Promise<SourceValidationAcknowledgement> {
    return this.unitOfWork.execute(async (transaction) => {
      const replay=await this.receipts.claimOrReplay(command.idempotencyKey,command.requestHash,transaction);
      if (replay) return SourceValidationAcknowledgementSchema.parse(replay);
      const source=await this.sources.applyValidatedLocator(command,transaction);
      const response={sourceAssetId:source.id,health:source.health,fingerprint:source.fingerprint};
      await this.receipts.complete(command.idempotencyKey,response,transaction);
      return response;
    });
  }
}
```

`WorkerSourceLocatorController` authenticates before parsing/reading, validates UUID and a closed validation schema, and maps Entity↔internal API explicitly. Its GET response is `Cache-Control: no-store`; its POST requires UUID `Idempotency-Key`. The composition logger receives only event/source ID/status. Extend Task 7's table-scoped `SourceAssetRepository`/`SourceAssetDataService` with `findById` and `applyValidatedLocator`; no job repository is imported there. Run the focused tests; expect PASS. Add browser-upload coverage proving a pending upload returns `SOURCE_NOT_READY`, a completed upload returns only its scoped object reference, and a public project response never contains either locator.

- [ ] **RED: prove duplicate terminal callbacks are side-effect free.**

```ts
// apps/web/src/modules/jobs/application/services/apply-worker-result.service.test.ts
import { expect, it } from 'vitest';
import { makeJobServiceHarness } from '../../testing/job-service-harness';

it('returns the recorded response without applying the same terminal result twice', async () => {
  const harness = makeJobServiceHarness();
  const command = { workflowId: '00000000-0000-4000-8000-000000000001', projectId: '00000000-0000-4000-8000-000000000002', status: 'COMPLETED', transcriptObjectKey: 'transcripts/p1/t1.json', clipIds: [], error: null, completedAt: '2026-07-11T00:00:00Z', idempotencyKey: '00000000-0000-4000-8000-000000000003', requestHash: '7d6f9e7f8be1d41e3607b94dbb6c21a779f8019a01bc0a7b39e3107db4a92721' } as const;
  const first = await harness.service.execute(command);
  const second = await harness.service.execute(command);
  expect(second).toEqual(first);
  expect(harness.projects.terminalMutationCount).toBe(1);
});
```

- [ ] Run the service test; expect import FAIL for the service.

- [ ] **GREEN: create the atomic callback service.**

```ts
export class ApplyWorkerResultService {
  constructor(private readonly unitOfWork: UnitOfWork, private readonly receipts: IdempotencyReceiptDataService, private readonly jobs: JobProjectionDataService, private readonly projects: ProjectTerminalPort) {}
  execute(command: ApplyWorkerResultCommand): Promise<ApplyWorkerResultResponse> {
    return this.unitOfWork.execute(async (transaction) => {
      const receipt = await this.receipts.findByKey(command.idempotencyKey, transaction);
      if (receipt) {
        if (receipt.requestHash !== command.requestHash) throw new IdempotencyConflictError(command.idempotencyKey);
        if (receipt.status === 'COMPLETED' && receipt.response) return receipt.response;
      } else {
        await this.receipts.createPending(command.idempotencyKey, command.requestHash, transaction);
      }
      const existing = await this.jobs.findByWorkflowId(command.workflowId, transaction);
      if (existing?.terminalResult) return this.receipts.complete(command.idempotencyKey, existing.terminalResult, transaction);
      const response = await this.projects.applyWorkerResult(command, transaction);
      await this.jobs.recordResult(command, response, transaction);
      return this.receipts.complete(command.idempotencyKey, response, transaction);
    });
  }
}
```

- [ ] Run service test; expect PASS. Add witnessed tests for hash conflict, missing key, progress after terminal, and artifact key outside the project prefix.

- [ ] **RED: integration-test transport status.** POST a valid result twice and assert 200 with identical bodies; omit token and assert 401; change payload under the same key and assert 409; use invalid contract version and assert 422.

- [ ] Add a failing callback test for `{status:'PAID_CALL_UNCERTAIN', uncertainReservedMicrousd:'9000', requiredAction:'AUTHORIZE_FRESH_RESERVATION'}`. Assert it is durable, not terminal, rejects a normal retry command, and accepts only a separate user-authorized command carrying `acknowledgePossiblePriorSpend:true`.

- [ ] **GREEN: create strict callback delivery.** `WorkerResultApiSchema` is a closed Zod object matching Task 5 object references and canonical states including `PAID_CALL_UNCERTAIN`; it has no transcript/media byte field. `WorkerResultController.apply` authenticates, requires UUID `Idempotency-Key`, hashes canonical JSON, converts API→Entity, calls `ApplyWorkerResultService`, and maps validation/auth/conflict to 422/401/409. `route.ts` contains only `return jobsComposition().workerResultController.apply(request, params.workflowId)`. The separate uncertain-retry schema is `z.object({acknowledgePossiblePriorSpend:z.literal(true)}).strict()` and its service calls Task 14 fresh reservation before the Temporal signal.

- [ ] **REFACTOR:** use typed errors and constant response envelopes, test API enum mapping and timestamps, and run architecture scans to prove no route imports Prisma/Redis/Temporal.

## Broader verification

```bash
pnpm exec vitest run apps/web/src/modules/jobs
pnpm exec vitest run tests/integration/internal-worker-callback.test.ts
pnpm test:contracts
pnpm test:architecture
git diff --check
```

Expected: duplicate terminal callbacks create one mutation and one receipt; unauthorized or incompatible payloads leave durable state unchanged.

**Suggested commit:** `feat: add idempotent worker callback boundary`
