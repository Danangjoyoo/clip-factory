import { expect, it, vi } from 'vitest';
import { WorkerResultController } from '../../apps/web/src/modules/jobs/delivery/http/worker-result.controller';
import { IdempotencyConflictError } from '../../apps/web/src/modules/jobs/application/services/apply-worker-result.service';
it('keeps the worker callback transport private and validates workflow ids', async () => {
  const controller = new WorkerResultController(
    { execute: vi.fn() } as never,
    'worker-token',
  );
  const unauthorized = await controller.apply(
    new Request('http://localhost', { method: 'POST' }),
    '00000000-0000-4000-8000-000000000001',
  );
  expect(unauthorized.status).toBe(401);
  const invalid = await controller.apply(
    new Request('http://localhost', {
      method: 'POST',
      headers: {
        authorization: 'Bearer worker-token',
        'idempotency-key': '00000000-0000-4000-8000-000000000002',
      },
    }),
    'not-a-uuid',
  );
  expect(invalid.status).toBe(422);
});
it('replays duplicate callbacks and rejects hash conflicts and closed artifact refs', async () => {
  const responses = new Map<string, { hash: string; response: object }>();
  const service = {
    execute: vi.fn(async (command: any) => {
      const prior = responses.get(command.idempotencyKey);
      if (prior && prior.hash !== command.requestHash)
        throw new IdempotencyConflictError(command.idempotencyKey);
      if (prior) return prior.response;
      const response = {
        workflowId: command.workflowId,
        projectId: command.projectId,
        status: command.status,
        completedAt: command.completedAt,
      };
      responses.set(command.idempotencyKey, {
        hash: command.requestHash,
        response,
      });
      return response;
    }),
  } as never;
  const controller = new WorkerResultController(service, 'worker-token');
  const headers = {
    authorization: 'Bearer worker-token',
    'idempotency-key': '00000000-0000-4000-8000-000000000002',
    'content-type': 'application/json',
  };
  const body = {
    schemaVersion: '1.0.0',
    projectId: '00000000-0000-4000-8000-000000000001',
    status: 'COMPLETED',
    completedAt: null,
    clipIds: [],
  };
  const first = await controller.apply(
    new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    '00000000-0000-4000-8000-000000000003',
  );
  const second = await controller.apply(
    new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    '00000000-0000-4000-8000-000000000003',
  );
  expect(first.status).toBe(200);
  expect(await second.json()).toEqual(await first.clone().json());
  const conflict = await controller.apply(
    new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, status: 'FAILED' }),
    }),
    '00000000-0000-4000-8000-000000000003',
  );
  expect(conflict.status).toBe(409);
  const invalid = await controller.apply(
    new Request('http://localhost', {
      method: 'POST',
      headers: {
        ...headers,
        'idempotency-key': '00000000-0000-4000-8000-000000000004',
      },
      body: JSON.stringify({
        ...body,
        transcriptObject: {
          bucket: 'wrong',
          key: `projects/${body.projectId}/transcript`,
          versionId: null,
          sha256: 'a'.repeat(64),
        },
      }),
    }),
    '00000000-0000-4000-8000-000000000003',
  );
  expect(invalid.status).toBe(422);
});
