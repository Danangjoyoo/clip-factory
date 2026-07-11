import { expect, it } from 'vitest';
import { workerResultApiToEntity } from './worker-result.converter';
it('keeps callback artifact and error metadata', () => {
  const value = workerResultApiToEntity(
    {
      schemaVersion: '1.0.0',
      projectId: '00000000-0000-4000-8000-000000000001',
      status: 'FAILED',
      completedAt: null,
      transcriptObject: null,
      clipIds: [],
      error: { code: 'X', message: 'failed' },
    },
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    'a'.repeat(64),
  );
  expect(value.error).toEqual({ code: 'X', message: 'failed' });
});
