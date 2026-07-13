import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPublicationAttemptRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication-attempt.repository';
import { PrismaPublicationRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication.repository';
import {
  PublicationAttemptStage,
  PublicationState,
  PublicationVisibility,
} from '../../../apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto';
import { integrationEnabled } from '../support/test-environment';

async function makeDatabase() {
  return (await import('../../../apps/web/src/infrastructure/prisma/client'))
    .prisma;
}

const metadata = {
  title: 'Title',
  description: '',
  hashtags: ['#clip'],
  keywordTags: ['clip'],
  categoryId: '22',
  defaultLanguage: 'en',
  madeForKids: false,
  containsSyntheticMedia: false,
} as const;

describe.skipIf(!integrationEnabled)('publication repositories', () => {
  let database: Awaited<ReturnType<typeof makeDatabase>>;
  let publications: PrismaPublicationRepository;
  let attempts: PrismaPublicationAttemptRepository;
  let ids: ReturnType<typeof makeIds>;

  beforeEach(async () => {
    database = await makeDatabase();
    publications = new PrismaPublicationRepository(database);
    attempts = new PrismaPublicationAttemptRepository(database);
    ids = makeIds();
    await database.$executeRawUnsafe(
      'truncate table projects, youtube_connections cascade',
    );
    await seedPublishingGraph(database, ids);
  });

  afterAll(async () => {
    await database?.$disconnect();
  });

  it('prevents duplicate remote-video intent and idempotency key', async () => {
    const first = makePublicationEntity(ids, {
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60',
      intentKey: 'clip-1-primary-upload-1',
      idempotencyKey: 'publish:clip-1:primary:1',
    });
    await publications.insert(first);
    await expect(
      publications.insert({
        ...first,
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb61' as never,
        workflowId: randomUUID() as never,
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      publications.insert({
        ...first,
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb62' as never,
        workflowId: randomUUID() as never,
        intentKey: 'clip-1-primary-upload-2',
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('persists independent timezone schedules as UTC instants', async () => {
    const tokyo = await publications.insert(
      makePublicationEntity(ids, {
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb63',
        clipId: ids.clipTwo as never,
        renderId: ids.renderTwo as never,
        metadataDraftId: ids.draftTwo as never,
        intentKey: 'clip-2-primary-upload-1',
        idempotencyKey: 'publish:clip-2:primary:1',
        visibility: PublicationVisibility.Scheduled,
        apiProjectVerifiedSnapshot: true,
        schedule: {
          sourceLocalDateTime: '2026-07-12T09:30:00',
          sourceTimezone: 'Asia/Tokyo',
          publishAtUtc: '2026-07-12T00:30:00.000Z',
        },
        state: PublicationState.Scheduled,
      }),
    );
    expect(tokyo.schedule?.sourceTimezone).toBe('Asia/Tokyo');
    expect(tokyo.schedule?.publishAtUtc).toBe('2026-07-12T00:30:00.000Z');
  });

  it('rejects private publishAt fields and unverified scheduled rows', async () => {
    const scheduled = await publications.insert(
      makePublicationEntity(ids, {
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb64',
        intentKey: 'clip-1-primary-upload-2',
        idempotencyKey: 'publish:clip-1:primary:2',
      }),
    );
    await expect(
      database.$executeRawUnsafe(
        `update publications
         set visibility = 'PRIVATE_REVIEW', source_timezone = 'Asia/Tokyo',
             source_local_datetime = '2026-07-12T09:30:00',
             schedule_at_utc = '2026-07-12T00:30:00Z'
         where id = '${scheduled.id}'`,
      ),
    ).rejects.toBeDefined();
    await expect(
      database.$executeRawUnsafe(
        `update publications
         set visibility = 'SCHEDULED', api_project_verified_snapshot = false,
             source_timezone = 'Asia/Tokyo',
             source_local_datetime = '2026-07-12T09:30:00',
             schedule_at_utc = '2026-07-12T00:30:00Z'
         where id = '${scheduled.id}'`,
      ),
    ).rejects.toBeDefined();
  });

  it('rejects partial video ID identity', async () => {
    const publication = await publications.insert(
      makePublicationEntity(ids, {
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb65',
        intentKey: 'clip-1-primary-upload-3',
        idempotencyKey: 'publish:clip-1:primary:3',
      }),
    );
    await expect(
      database.$executeRawUnsafe(
        `update publications set youtube_video_id = 'yt-1' where id = '${publication.id}'`,
      ),
    ).rejects.toBeDefined();
  });

  it('bounds bounded attempt progress and numbers attempts per publication', async () => {
    const publication = await publications.insert(makePublicationEntity(ids));
    const attempt = makePublicationAttemptEntity({
      publicationId: publication.id,
      attemptNumber: 1,
      acknowledgedBytes: 524_288n,
      totalBytes: 1_048_576n,
      progressPercent: 50,
    });
    await expect(attempts.insert(attempt)).resolves.toMatchObject({
      progressPercent: 50,
    });
    await expect(
      database.$executeRawUnsafe(
        `update publication_attempts set acknowledged_bytes = total_bytes + 1 where id = '${attempt.id}'`,
      ),
    ).rejects.toBeDefined();
    await expect(
      attempts.insert({
        ...attempt,
        id: randomUUID() as never,
        idempotencyKey: 'attempt:clip-1:2',
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps stale attempt progress from decreasing acknowledged bytes', async () => {
    const publication = await publications.insert(makePublicationEntity(ids));
    const attempt = await attempts.insert(
      makePublicationAttemptEntity({
        publicationId: publication.id,
        acknowledgedBytes: 700n,
        totalBytes: 1_000n,
        progressPercent: 70,
      }),
    );
    await expect(
      attempts.saveProgress({
        id: attempt.id,
        acknowledgedBytes: 600n,
        totalBytes: 1_000n,
        progressPercent: 60,
        stage: PublicationAttemptStage.Uploading,
        updatedAt: new Date('2026-07-12T00:00:01.000Z'),
      }),
    ).resolves.toMatchObject({ acknowledgedBytes: 700n, progressPercent: 70 });
  });

  it('requires durable final-dispatch for uncertain post-final attempts', async () => {
    const publication = await publications.insert(makePublicationEntity(ids));
    await attempts.insert(
      makePublicationAttemptEntity({ publicationId: publication.id }),
    );
    await expect(
      database.$executeRawUnsafe(
        `update publication_attempts
         set outcome_uncertain_at = '2026-07-11T01:00:01Z'
         where publication_id = '${publication.id}'`,
      ),
    ).rejects.toBeDefined();
  });
});

function makeIds() {
  return {
    project: randomUUID(),
    clipOne: randomUUID(),
    clipTwo: randomUUID(),
    renderOne: randomUUID(),
    renderTwo: randomUUID(),
    connection: randomUUID(),
    draftOne: randomUUID(),
    draftTwo: randomUUID(),
  };
}

async function seedPublishingGraph(
  database: Awaited<ReturnType<typeof makeDatabase>>,
  seed: ReturnType<typeof makeIds>,
) {
  await database.$executeRawUnsafe(
    `insert into projects (id, name, mode, language_tag, default_max_clip_seconds, default_platform_preset, updated_at)
     values ('${seed.project}', 'publication', 'MANUAL', 'en', 60, 'YOUTUBE_SHORTS', now())`,
  );
  for (const clip of [seed.clipOne, seed.clipTwo]) {
    await database.$executeRawUnsafe(
      `insert into clips (id, project_id, origin, start_ms, end_ms, caption_json, style_json, frame_json, state, updated_at)
       values ('${clip}', '${seed.project}', 'MANUAL', 0, 1000, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'RENDERED', now())`,
    );
  }
  await database.$executeRawUnsafe(
    `insert into renders (id, project_id, clip_id, status, input_snapshot_json, output_object_key, encoder)
     values ('${seed.renderOne}', '${seed.project}', '${seed.clipOne}', 'COMPLETED', '{}'::jsonb, 'renders/one.mp4', 'ffmpeg'),
            ('${seed.renderTwo}', '${seed.project}', '${seed.clipTwo}', 'COMPLETED', '{}'::jsonb, 'renders/two.mp4', 'ffmpeg')`,
  );
  await database.$executeRawUnsafe(
    `insert into youtube_connections (id, slot, channel_id, channel_title, granted_scopes, state, oauth_mode)
     values ('${seed.connection}', 'PRIMARY', 'UC-safe-channel', 'Clip Factory Test', '[]'::jsonb, 'CONNECTED', 'TESTING')`,
  );
  await database.$executeRawUnsafe(
    `insert into publishing_metadata_drafts
       (id, project_id, clip_id, version, state, source, title, description, hashtags,
        keyword_tags, category_id, default_language, made_for_kids,
        contains_synthetic_media, approved_at)
     values
       ('${seed.draftOne}', '${seed.project}', '${seed.clipOne}', 1, 'APPROVED', 'MANUAL',
        'Title', '', '[]'::jsonb, '[]'::jsonb, '22', 'en', false, false, now()),
       ('${seed.draftTwo}', '${seed.project}', '${seed.clipTwo}', 1, 'APPROVED', 'MANUAL',
        'Title', '', '[]'::jsonb, '[]'::jsonb, '22', 'en', false, false, now())`,
  );
}

function makePublicationEntity(
  seed: ReturnType<typeof makeIds>,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60' as never,
    projectId: seed.project as never,
    clipId: seed.clipOne as never,
    renderId: seed.renderOne as never,
    connectionId: seed.connection as never,
    metadataDraftId: seed.draftOne as never,
    workflowId: randomUUID() as never,
    intentKey: 'clip-1-primary-upload-1',
    idempotencyKey: 'publish:clip-1:primary:1',
    metadataSnapshot: metadata,
    visibility: PublicationVisibility.PrivateReview,
    apiProjectVerifiedSnapshot: false,
    schedule: null,
    state: PublicationState.ReadyToUpload,
    youtubeVideoId: null,
    youtubeUrl: null,
    remoteVideoCreatedAt: null,
    thumbnailWarningCode: null,
    sanitizedErrorCode: null,
    sanitizedErrorMessage: null,
    ...overrides,
  };
}

function makePublicationAttemptEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID() as never,
    publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60' as never,
    attemptNumber: 1,
    idempotencyKey: 'attempt:clip-1:1',
    resumableSessionReference: null,
    acknowledgedBytes: 0n,
    totalBytes: 1_000n,
    stage: PublicationAttemptStage.Starting,
    progressPercent: 0,
    finalChunkDispatchStartedAt: null,
    outcomeUncertainAt: null,
    reconciliationCheckedAt: null,
    reconciliationResult: null,
    duplicateRiskAcknowledgedAt: null,
    sanitizedErrorCode: null,
    sanitizedErrorMessage: null,
    startedAt: new Date('2026-07-12T00:00:00.000Z'),
    completedAt: null,
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
  };
}
