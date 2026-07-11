import { expect, it } from 'vitest';
import { authenticateInternalRequest } from './internal-auth';

it('accepts only the exact bearer service credential', () => {
  expect(
    authenticateInternalRequest(
      'Bearer worker-local-token',
      'worker-local-token',
    ),
  ).toBe(true);
  expect(
    authenticateInternalRequest(
      'Bearer worker-local-token-x',
      'worker-local-token',
    ),
  ).toBe(false);
  expect(authenticateInternalRequest(null, 'worker-local-token')).toBe(false);
});
