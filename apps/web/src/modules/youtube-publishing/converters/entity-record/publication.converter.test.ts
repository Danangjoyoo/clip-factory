import { expect, it } from 'vitest';
import {
  PublicationState,
  PublicationVisibility,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import {
  publicationEntityToRecord,
  publicationRecordToEntity,
} from './publication.converter';
import type { PublicationRecordDto } from '../../adapters/persistence/dto/record/publication-record.dto';

const makePublicationRecord = (
  overrides: Partial<PublicationRecordDto> = {},
): PublicationRecordDto => ({
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60',
  project_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb50',
  clip_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb51',
  render_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52',
  connection_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb53',
  metadata_draft_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54',
  workflow_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb55',
  intent_key: 'clip-1-primary-upload-1',
  idempotency_key: 'publish:clip-1:primary:1',
  metadata_snapshot: {
    title: 'Title',
    description: '',
    hashtags: ['#clip'],
    keywordTags: ['clip'],
    categoryId: '22',
    defaultLanguage: 'en',
    madeForKids: false,
    containsSyntheticMedia: false,
  },
  visibility: 'PRIVATE_REVIEW',
  api_project_verified_snapshot: false,
  source_local_datetime: null,
  source_timezone: null,
  schedule_at_utc: null,
  state: 'READY_TO_UPLOAD',
  youtube_video_id: null,
  youtube_url: null,
  remote_video_created_at: null,
  thumbnail_warning_code: null,
  sanitized_error_code: null,
  sanitized_error_message: null,
  created_at: new Date('2026-07-12T00:00:00.000Z'),
  updated_at: new Date('2026-07-12T00:00:00.000Z'),
  ...overrides,
});

it('maps an immutable schedule and validated metadata snapshot', () => {
  const record = makePublicationRecord({
    visibility: 'SCHEDULED',
    state: 'SCHEDULED',
    api_project_verified_snapshot: true,
    source_local_datetime: '2026-07-12T09:30:00',
    source_timezone: 'Asia/Tokyo',
    schedule_at_utc: new Date('2026-07-12T00:30:00.000Z'),
  });
  const entity = publicationRecordToEntity(record);
  expect(entity.state).toBe(PublicationState.Scheduled);
  expect(entity.schedule).toEqual({
    sourceLocalDateTime: '2026-07-12T09:30:00',
    sourceTimezone: 'Asia/Tokyo',
    publishAtUtc: '2026-07-12T00:30:00.000Z',
  });
  expect(Object.isFrozen(entity.metadataSnapshot)).toBe(true);
  expect(publicationEntityToRecord(entity)).toMatchObject({
    visibility: 'SCHEDULED',
    schedule_at_utc: new Date('2026-07-12T00:30:00.000Z'),
  });
});

it('rejects a partial schedule tuple and unknown state', () => {
  expect(() =>
    publicationRecordToEntity(
      makePublicationRecord({
        visibility: 'SCHEDULED',
        source_timezone: null,
      }),
    ),
  ).toThrow('persisted scheduled publication has an incomplete schedule');
  expect(() =>
    publicationRecordToEntity(
      makePublicationRecord({
        state: 'QUEUED' as never,
      }),
    ),
  ).toThrow('unknown publication record state QUEUED');
});

it('maps private-review visibility without schedule', () => {
  expect(publicationRecordToEntity(makePublicationRecord())).toMatchObject({
    visibility: PublicationVisibility.PrivateReview,
    schedule: null,
  });
});
