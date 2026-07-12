import { expect, it } from 'vitest';
import { PublicationAttemptStage } from '../../application/dto/entity/youtube-publishing-entity.dto';
import {
  publicationAttemptEntityToRecord,
  publicationAttemptRecordToEntity,
} from './publication-attempt.converter';
import type { PublicationAttemptRecordDto } from '../../adapters/persistence/dto/record/publication-attempt-record.dto';

const makePublicationAttemptRecord = (
  overrides: Partial<PublicationAttemptRecordDto> = {},
): PublicationAttemptRecordDto => ({
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb70',
  publication_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60',
  attempt_number: 1,
  idempotency_key: 'attempt:clip-1:1',
  resumable_session_reference: null,
  acknowledged_bytes: 0n,
  total_bytes: 1_000n,
  stage: 'STARTING',
  progress_percent: 0,
  final_chunk_dispatch_started_at: null,
  outcome_uncertain_at: null,
  reconciliation_checked_at: null,
  reconciliation_result: null,
  duplicate_risk_acknowledged_at: null,
  sanitized_error_code: null,
  sanitized_error_message: null,
  started_at: new Date('2026-07-12T00:00:00.000Z'),
  completed_at: null,
  updated_at: new Date('2026-07-12T00:00:00.000Z'),
  ...overrides,
});

it('preserves large offsets and uncertainty audit fields exactly', () => {
  const record = makePublicationAttemptRecord({
    acknowledged_bytes: 9_007_199_254_740_993n,
    total_bytes: 9_007_199_254_741_000n,
    resumable_session_reference: 'opaque-session-reference',
    stage: 'OUTCOME_UNCERTAIN',
    final_chunk_dispatch_started_at: new Date('2026-07-12T00:00:01.000Z'),
    outcome_uncertain_at: new Date('2026-07-12T00:00:02.000Z'),
    reconciliation_checked_at: new Date('2026-07-12T00:00:03.000Z'),
    reconciliation_result: 'INCONCLUSIVE',
    duplicate_risk_acknowledged_at: new Date('2026-07-12T00:00:04.000Z'),
  });
  const entity = publicationAttemptRecordToEntity(record);
  expect(entity.stage).toBe(PublicationAttemptStage.OutcomeUncertain);
  expect(entity.acknowledgedBytes).toBe(9_007_199_254_740_993n);
  expect(entity.resumableSessionReference).toBe('opaque-session-reference');
  expect(publicationAttemptEntityToRecord(entity)).toMatchObject(record);
});

it('rejects an unknown attempt stage', () => {
  expect(() =>
    publicationAttemptRecordToEntity(
      makePublicationAttemptRecord({ stage: 'QUEUED' as never }),
    ),
  ).toThrow('unknown publication attempt stage QUEUED');
});
