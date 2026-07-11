import { expect, it, vi } from 'vitest';
import { WorkerResultController } from '../../apps/web/src/modules/jobs/delivery/http/worker-result.controller';
it('keeps the worker callback transport private and validates workflow ids', async () => {
  const controller = new WorkerResultController({ execute: vi.fn() } as never, 'worker-token');
  const unauthorized = await controller.apply(new Request('http://localhost', { method: 'POST' }), '00000000-0000-4000-8000-000000000001');
  expect(unauthorized.status).toBe(401);
  const invalid = await controller.apply(new Request('http://localhost', { method: 'POST', headers: { authorization: 'Bearer worker-token', 'idempotency-key': '00000000-0000-4000-8000-000000000002' } }), 'not-a-uuid');
  expect(invalid.status).toBe(422);
});
