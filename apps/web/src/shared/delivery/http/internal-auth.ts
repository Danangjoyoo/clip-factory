import { timingSafeEqual } from 'node:crypto';

export function authenticateInternalRequest(
  header: string | null,
  expected: string,
): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export const INTERNAL_UNAUTHORIZED = {
  code: 'INTERNAL_UNAUTHORIZED',
  message: 'Internal service authentication failed',
} as const;
