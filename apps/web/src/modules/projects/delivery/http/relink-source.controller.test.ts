import { expect, it, vi } from 'vitest';
import { RelinkSourceController } from './relink-source.controller';

it('requires internal authentication', async () => {
  const controller = new RelinkSourceController({ execute: vi.fn() } as any, 'secret');
  const response = await controller.post(new Request('http://test', { method: 'POST', body: JSON.stringify({ displayPath: 'x', resolvedPath: '/x' }) }), 'p');
  expect(response.status).toBe(401);
});
