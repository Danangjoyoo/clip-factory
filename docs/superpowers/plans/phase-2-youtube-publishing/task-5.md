# Task 5: Publication and Attempt Persistence with Idempotency

> **Implementation mode:** Complete after Tasks 1–2. This task owns the `publications` and `publication_attempts` persistence boundaries. It does not call Temporal or YouTube.

## Purpose

Persist an immutable approved metadata snapshot and one logical remote-video intent per publication, plus bounded resumable-attempt progress/history. Database constraints must prevent duplicate intents, duplicate idempotency keys, invalid schedules, and impossible byte progress.

## Requirements and traceability

- YouTube design §§11–14: immutable request snapshot, separate per-clip workflow, `Publication`, `PublicationAttempt`, active-intent uniqueness, canonical states, cancellation semantics.
- YouTube design §§15–19: warning-only thumbnail result, sanitized errors, restart idempotency, one-table repositories and explicit converters.
- Acceptance criteria 6–10: independent schedules, video ID/URL, private-only unverified behavior, offline schedules, isolated failures.

## Clean Architecture ownership

- **Affected layers:** Entity DTOs from Task 2, Record DTOs, entity-record converters, repositories, data services.
- **Owned tables:** `publications` and `publication_attempts`; each has its own repository and data service.
- **Repository rule:** application owns one repository port/Record DTO per table; neither Prisma implementation imports the other.
- **Data-service rule:** each data service imports exactly its matching application-owned port and no adapter.
- **Deferred to Task 12:** cross-table creation transaction, state orchestration, Temporal start, retry/cancel business policy.

## Files

- Create: `prisma/migrations/20260712000300_phase_2_publications/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/record/publication-record.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/record/publication-attempt-record.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/publication.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/publication-attempt.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publication.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publication.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication-attempt.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publication.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publication-attempt.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publication-data-services.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publication-data-services.architecture.test.ts`
- Create: `tests/integration/youtube-publishing/publication-repositories.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`

## Prerequisites

- Tasks 1–2 complete; Tasks 3–4 migration directories are present in the merged branch.
- Phase 1 `projects`, `clips`, `renders`, and Task 3/4 tables are available in the disposable database.

## Interfaces

Add `PublicationAttemptEntityDto`:

```ts
export enum PublicationAttemptStage {
  Starting = 'STARTING',
  Uploading = 'UPLOADING',
  OutcomeUncertain = 'OUTCOME_UNCERTAIN',
  Reconciling = 'RECONCILING',
  Polling = 'POLLING',
  Thumbnail = 'THUMBNAIL',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export type PublicationAttemptEntityDto = {
  id: PublicationAttemptId;
  publicationId: PublicationId;
  attemptNumber: number;
  idempotencyKey: string;
  resumableSessionReference: string | null;
  acknowledgedBytes: bigint;
  totalBytes: bigint;
  stage: PublicationAttemptStage;
  progressPercent: number;
  finalChunkDispatchStartedAt: Date | null;
  outcomeUncertainAt: Date | null;
  reconciliationCheckedAt: Date | null;
  reconciliationResult: 'VIDEO_FOUND' | 'NO_MATCH_FOUND' | 'INCONCLUSIVE' | null;
  duplicateRiskAcknowledgedAt: Date | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};
```

Repository contracts are persistence-focused:

```ts
export interface PublicationRepositoryPort {
  findById(id: string): Promise<PublicationRecordDto | null>;
  findByIdempotencyKey(key: string): Promise<PublicationRecordDto | null>;
  listByProject(projectId: string): Promise<readonly PublicationRecordDto[]>;
  insert(record: InsertPublicationRecordDto): Promise<PublicationRecordDto>;
  updateState(input: UpdatePublicationStateRecordDto): Promise<PublicationRecordDto | null>;
  attachRemoteVideo(input: AttachRemoteVideoRecordDto): Promise<PublicationRecordDto | null>;
}

export interface PublicationAttemptRepositoryPort {
  findById(id: string): Promise<PublicationAttemptRecordDto | null>;
  listByPublication(publicationId: string): Promise<readonly PublicationAttemptRecordDto[]>;
  insert(record: InsertPublicationAttemptRecordDto): Promise<PublicationAttemptRecordDto>;
  saveProgress(input: SaveAttemptProgressRecordDto): Promise<PublicationAttemptRecordDto | null>;
  finish(input: FinishAttemptRecordDto): Promise<PublicationAttemptRecordDto | null>;
}
```

## RED-GREEN-REFACTOR cycle 1: relational constraints and indexes

- [ ] **RED 1.1 — Write real-database constraint tests first.**

Create `publication-repositories.test.ts` with the Phase 1 seed helpers and complete approved draft/connection/render rows:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaPublicationAttemptRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication-attempt.repository';
import { PrismaPublicationRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication.repository';
import { createMigratedTestDatabase } from '../support/postgres';
import { seedApprovedPublishingGraph } from '../support/seed-youtube-publishing';

describe('publication repositories', () => {
  const database = createMigratedTestDatabase();
  beforeAll(async () => {
    await database.start();
    await seedApprovedPublishingGraph(database);
  });
  afterAll(() => database.stop());

  it('prevents duplicate remote-video intent and idempotency key', async () => {
    const repository = new PrismaPublicationRepository(database.prisma);
    const first = makePublicationRecord({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60',
      intent_key: 'clip-1-primary-upload-1',
      idempotency_key: 'publish:clip-1:primary:1',
    });
    await repository.insert(first);
    await expect(repository.insert({ ...first, id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb61' }))
      .rejects.toMatchObject({ code: 'P2002' });
    await expect(repository.insert({
      ...first,
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb62',
      intent_key: 'clip-1-primary-upload-2',
    })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('persists independent timezone schedules as UTC instants', async () => {
    const repository = new PrismaPublicationRepository(database.prisma);
    const tokyo = await repository.insert(makePublicationRecord({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb63',
      clip_id: youtubeSeed.clipTwoId,
      intent_key: 'clip-2-primary-upload-1',
      idempotency_key: 'publish:clip-2:primary:1',
      visibility: 'SCHEDULED',
      api_project_verified_snapshot: true,
      source_local_datetime: '2026-07-12T09:30:00',
      source_timezone: 'Asia/Tokyo',
      schedule_at_utc: new Date('2026-07-12T00:30:00.000Z'),
    }));
    expect(tokyo.source_timezone).toBe('Asia/Tokyo');
    expect(tokyo.schedule_at_utc?.toISOString()).toBe('2026-07-12T00:30:00.000Z');
  });

  it('rejects schedule fields for private review and scheduling for unverified projects', async () => {
    await expect(database.query(
      `update publications
       set visibility = 'PRIVATE_REVIEW', source_timezone = 'Asia/Tokyo',
           source_local_datetime = '2026-07-12T09:30:00',
           schedule_at_utc = '2026-07-12T00:30:00Z'
       where id = '018f4f2c-93d7-7c75-8f0f-7f5165e8bb63'`,
    )).rejects.toMatchObject({ code: '23514' });
  });

  it('bounds attempt progress and numbers attempts per publication', async () => {
    const repository = new PrismaPublicationAttemptRepository(database.prisma);
    const attempt = makePublicationAttemptRecord({
      publication_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60',
      attempt_number: 1,
      acknowledged_bytes: 524_288n,
      total_bytes: 1_048_576n,
      progress_percent: 50,
    });
    await expect(repository.insert(attempt)).resolves.toMatchObject({ progress_percent: 50 });
    await expect(database.query(
      `update publication_attempts set acknowledged_bytes = total_bytes + 1 where id = $1`,
      [attempt.id],
    )).rejects.toMatchObject({ code: '23514' });
  });

  it('requires durable final-dispatch and reconciliation audit fields for uncertainty', async () => {
    await expect(database.query(
      `update publication_attempts
       set outcome_uncertain_at = '2026-07-11T01:00:01Z'
       where publication_id = '018f4f2c-93d7-7c75-8f0f-7f5165e8bb60'`,
    )).rejects.toMatchObject({ code: '23514' });
  });
});
```

- [ ] **RED 1.2 — Witness the missing relations.**

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publication-repositories.test.ts
```

Expected RED: apply the RED table/repository shells first; duplicate publication idempotency keys are both inserted instead of raising `publications_idempotency_key`. A missing relation/import failure is not accepted.

- [ ] **GREEN 1.3 — Add exact tables and checks.**

Create `migration.sql`:

```sql
create table "publications" (
  "id" uuid primary key,
  "project_id" uuid not null references "projects" ("id") on delete cascade,
  "clip_id" uuid not null references "clips" ("id") on delete restrict,
  "render_id" uuid not null references "renders" ("id") on delete restrict,
  "connection_id" uuid not null references "youtube_connections" ("id") on delete restrict,
  "metadata_draft_id" uuid not null references "publishing_metadata_drafts" ("id") on delete restrict,
  "workflow_id" text not null,
  "intent_key" text not null,
  "idempotency_key" text not null,
  "metadata_snapshot" jsonb not null,
  "visibility" text not null,
  "api_project_verified_snapshot" boolean not null,
  "source_local_datetime" text,
  "source_timezone" text,
  "schedule_at_utc" timestamptz,
  "state" text not null,
  "youtube_video_id" text,
  "youtube_url" text,
  "remote_video_created_at" timestamptz,
  "thumbnail_warning_code" text,
  "sanitized_error_code" text,
  "sanitized_error_message" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "publications_metadata_snapshot_check" check (jsonb_typeof("metadata_snapshot") = 'object'),
  constraint "publications_visibility_check" check ("visibility" in ('PRIVATE_REVIEW', 'SCHEDULED')),
  constraint "publications_state_check" check (
    "state" in ('READY_TO_UPLOAD', 'UPLOADING', 'UPLOAD_OUTCOME_UNCERTAIN',
                'YOUTUBE_PROCESSING', 'PRIVATE_REVIEW', 'SCHEDULED', 'PUBLISHED',
                'FAILED', 'CANCELLED')
  ),
  constraint "publications_schedule_check" check (
    ("visibility" = 'PRIVATE_REVIEW' and "source_local_datetime" is null and
      "source_timezone" is null and "schedule_at_utc" is null) or
    ("visibility" = 'SCHEDULED' and "api_project_verified_snapshot" and
      "source_local_datetime" is not null and "source_timezone" is not null and
      "schedule_at_utc" is not null)
  ),
  constraint "publications_remote_identity_check" check (
    ("youtube_video_id" is null and "youtube_url" is null and "remote_video_created_at" is null) or
    ("youtube_video_id" is not null and "youtube_url" is not null and "remote_video_created_at" is not null)
  )
);

create unique index "publications_connection_intent_key"
  on "publications" ("connection_id", "intent_key");
create unique index "publications_idempotency_key"
  on "publications" ("idempotency_key");
create unique index "publications_workflow_id_key"
  on "publications" ("workflow_id");
create unique index "publications_youtube_video_id_key"
  on "publications" ("youtube_video_id") where "youtube_video_id" is not null;
create index "publications_project_created_idx"
  on "publications" ("project_id", "created_at" desc);
create index "publications_schedule_state_idx"
  on "publications" ("state", "schedule_at_utc") where "schedule_at_utc" is not null;

create table "publication_attempts" (
  "id" uuid primary key,
  "publication_id" uuid not null references "publications" ("id") on delete cascade,
  "attempt_number" integer not null,
  "idempotency_key" text not null,
  "resumable_session_reference" text,
  "acknowledged_bytes" bigint not null default 0,
  "total_bytes" bigint not null,
  "stage" text not null,
  "progress_percent" integer not null default 0,
  "final_chunk_dispatch_started_at" timestamptz,
  "outcome_uncertain_at" timestamptz,
  "reconciliation_checked_at" timestamptz,
  "reconciliation_result" text,
  "duplicate_risk_acknowledged_at" timestamptz,
  "sanitized_error_code" text,
  "sanitized_error_message" text,
  "started_at" timestamptz not null default now(),
  "completed_at" timestamptz,
  "updated_at" timestamptz not null default now(),
  constraint "publication_attempts_number_check" check ("attempt_number" > 0),
  constraint "publication_attempts_bytes_check" check (
    "total_bytes" > 0 and "acknowledged_bytes" >= 0 and "acknowledged_bytes" <= "total_bytes"
  ),
  constraint "publication_attempts_progress_check" check ("progress_percent" between 0 and 100),
  constraint "publication_attempts_reconciliation_result_check" check (
    "reconciliation_result" is null or
    "reconciliation_result" in ('VIDEO_FOUND', 'NO_MATCH_FOUND', 'INCONCLUSIVE')
  ),
  constraint "publication_attempts_uncertainty_audit_check" check (
    ("outcome_uncertain_at" is null and "reconciliation_checked_at" is null and
      "reconciliation_result" is null and "duplicate_risk_acknowledged_at" is null) or
    ("final_chunk_dispatch_started_at" is not null and "outcome_uncertain_at" is not null and
      (("reconciliation_checked_at" is null and "reconciliation_result" is null and
        "duplicate_risk_acknowledged_at" is null) or
       ("reconciliation_checked_at" is not null and "reconciliation_result" is not null and
        ("duplicate_risk_acknowledged_at" is null or
         "duplicate_risk_acknowledged_at" >= "reconciliation_checked_at")))
    )
  ),
  constraint "publication_attempts_stage_check" check (
    "stage" in ('STARTING', 'UPLOADING', 'OUTCOME_UNCERTAIN', 'RECONCILING',
                'POLLING', 'THUMBNAIL', 'COMPLETED', 'FAILED', 'CANCELLED')
  )
);

create unique index "publication_attempts_publication_number_key"
  on "publication_attempts" ("publication_id", "attempt_number");
create unique index "publication_attempts_idempotency_key"
  on "publication_attempts" ("idempotency_key");
create index "publication_attempts_publication_started_idx"
  on "publication_attempts" ("publication_id", "started_at" desc);
```

Append these Prisma models, plus the inverse relation arrays on `Project`, `Clip`, `Render`, `YouTubeConnection`, and `PublishingMetadataDraft`. The two partial indexes remain owned by the literal SQL migration because Prisma schema syntax cannot express their predicates:

```prisma
model Publication {
  id                         String   @id @db.Uuid
  projectId                  String   @map("project_id") @db.Uuid
  clipId                     String   @map("clip_id") @db.Uuid
  renderId                   String   @map("render_id") @db.Uuid
  connectionId               String   @map("connection_id") @db.Uuid
  metadataDraftId            String   @map("metadata_draft_id") @db.Uuid
  workflowId                 String   @unique(map: "publications_workflow_id_key") @map("workflow_id")
  intentKey                  String   @map("intent_key")
  idempotencyKey             String   @unique(map: "publications_idempotency_key") @map("idempotency_key")
  metadataSnapshot           Json     @map("metadata_snapshot")
  visibility                 String
  apiProjectVerifiedSnapshot Boolean  @map("api_project_verified_snapshot")
  sourceLocalDatetime        String?  @map("source_local_datetime")
  sourceTimezone             String?  @map("source_timezone")
  scheduleAtUtc              DateTime? @map("schedule_at_utc") @db.Timestamptz(6)
  state                      String
  youtubeVideoId             String?  @map("youtube_video_id")
  youtubeUrl                 String?  @map("youtube_url")
  remoteVideoCreatedAt       DateTime? @map("remote_video_created_at") @db.Timestamptz(6)
  thumbnailWarningCode       String?  @map("thumbnail_warning_code")
  sanitizedErrorCode         String?  @map("sanitized_error_code")
  sanitizedErrorMessage      String?  @map("sanitized_error_message")
  createdAt                  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  project                    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clip                       Clip @relation(fields: [clipId], references: [id], onDelete: Restrict)
  render                     Render @relation(fields: [renderId], references: [id], onDelete: Restrict)
  connection                 YouTubeConnection @relation(fields: [connectionId], references: [id], onDelete: Restrict)
  metadataDraft              PublishingMetadataDraft @relation(fields: [metadataDraftId], references: [id], onDelete: Restrict)
  attempts                   PublicationAttempt[]

  @@unique([connectionId, intentKey], map: "publications_connection_intent_key")
  @@index([projectId, createdAt(sort: Desc)], map: "publications_project_created_idx")
  @@map("publications")
}

model PublicationAttempt {
  id                           String   @id @db.Uuid
  publicationId                String   @map("publication_id") @db.Uuid
  attemptNumber                Int      @map("attempt_number")
  idempotencyKey               String   @unique(map: "publication_attempts_idempotency_key") @map("idempotency_key")
  resumableSessionReference    String?  @map("resumable_session_reference")
  acknowledgedBytes            BigInt   @default(0) @map("acknowledged_bytes")
  totalBytes                   BigInt   @map("total_bytes")
  stage                        String
  progressPercent              Int      @default(0) @map("progress_percent")
  finalChunkDispatchStartedAt  DateTime? @map("final_chunk_dispatch_started_at") @db.Timestamptz(6)
  outcomeUncertainAt           DateTime? @map("outcome_uncertain_at") @db.Timestamptz(6)
  reconciliationCheckedAt      DateTime? @map("reconciliation_checked_at") @db.Timestamptz(6)
  reconciliationResult         String?  @map("reconciliation_result")
  duplicateRiskAcknowledgedAt DateTime? @map("duplicate_risk_acknowledged_at") @db.Timestamptz(6)
  sanitizedErrorCode           String?  @map("sanitized_error_code")
  sanitizedErrorMessage        String?  @map("sanitized_error_message")
  startedAt                    DateTime @default(now()) @map("started_at") @db.Timestamptz(6)
  completedAt                  DateTime? @map("completed_at") @db.Timestamptz(6)
  updatedAt                    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  publication                  Publication @relation(fields: [publicationId], references: [id], onDelete: Cascade)

  @@unique([publicationId, attemptNumber], map: "publication_attempts_publication_number_key")
  @@index([publicationId, startedAt(sort: Desc)], map: "publication_attempts_publication_started_idx")
  @@map("publication_attempts")
}
```

Implement the two application ports in explicit-select `PrismaPublicationRepository`/`PrismaPublicationAttemptRepository` adapters returning complete application-owned snake-case Record DTOs. `saveProgress` updates only when the new acknowledged byte count is greater than or equal to the persisted count; stale heartbeats return the current row without decreasing progress. Add `markFinalChunkDispatchStarted`, `markOutcomeUncertain`, `recordReconciliation`, and `acknowledgeDuplicateRisk` to `PublicationAttemptRepositoryPort`; the Prisma implementation uses guarded `updateMany` predicates so timestamps are monotonic and duplicate-risk acknowledgement is impossible before reconciliation.

Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm exec vitest run tests/integration/youtube-publishing/publication-repositories.test.ts
```

Expected GREEN: all repository and constraint cases PASS.

- [ ] **REFACTOR 1.4 — Verify index fit without speculative indexes.**

Run `EXPLAIN (ANALYZE, BUFFERS)` for project list ordering, idempotency lookup, and attempt-history lookup using seeded cardinality. Retain only indexes used by these real predicates plus uniqueness constraints. Rerun repository tests.

```sql
explain (analyze, buffers) select id from publications where project_id = :'project_id' order by created_at desc limit 50;
explain (analyze, buffers) select id from publications where idempotency_key = :'idempotency_key';
explain (analyze, buffers) select id from publication_attempts where publication_id = :'publication_id' order by started_at desc;
```

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publication-repositories.test.ts
```

## RED-GREEN-REFACTOR cycle 2: Record/Entity converter isolation

- [ ] **RED 2.1 — Write converter tests for snapshot, enums, timezones, bytes, and malformed data.**

Create both converter tests. The publication test must include:

```ts
it('maps an immutable schedule and validated metadata snapshot', () => {
  const record = makePublicationRecord({
    visibility: 'SCHEDULED',
    state: 'SCHEDULED',
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
});

it('rejects a partial schedule tuple and unknown state', () => {
  expect(() => publicationRecordToEntity(makePublicationRecord({
    visibility: 'SCHEDULED',
    source_timezone: null,
  }))).toThrow('persisted scheduled publication has an incomplete schedule');
  expect(() => publicationRecordToEntity(makePublicationRecord({
    state: 'QUEUED' as never,
  }))).toThrow('unknown publication record state QUEUED');
});
```

The attempt converter test contains these literal assertions:

```ts
it('preserves large offsets and uncertainty audit fields exactly', () => {
  const record = makePublicationAttemptRecord({
    acknowledged_bytes: 9_007_199_254_740_993n,
    total_bytes: 9_007_199_254_741_000n,
    resumable_session_reference: 'opaque-session-reference',
    final_chunk_dispatch_started_at: new Date('2026-07-12T00:00:01.000Z'),
    outcome_uncertain_at: new Date('2026-07-12T00:00:02.000Z'),
    reconciliation_checked_at: new Date('2026-07-12T00:00:03.000Z'),
    reconciliation_result: 'INCONCLUSIVE',
    duplicate_risk_acknowledged_at: new Date('2026-07-12T00:00:04.000Z'),
  });
  const entity = publicationAttemptRecordToEntity(record);
  expect(entity.acknowledgedBytes).toBe(9_007_199_254_740_993n);
  expect(entity.resumableSessionReference).toBe('opaque-session-reference');
  expect(publicationAttemptEntityToRecord(entity)).toMatchObject(record);
});

it('rejects an unknown attempt stage', () => {
  expect(() => publicationAttemptRecordToEntity(
    makePublicationAttemptRecord({ stage: 'QUEUED' as never }),
  )).toThrow('unknown publication attempt stage QUEUED');
});
```

- [ ] **RED 2.2 — Witness missing converters.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publication.converter.test.ts src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.test.ts
```

Expected RED: converter signature shells collect; `acknowledged_bytes = 9007199254740993n` is not preserved exactly by the temporary converter result.

- [ ] **GREEN 2.3 — Implement explicit maps and validation.**

Implement both converter pairs with separate Record and Entity enum maps, `parsePublishingMetadata` for the JSON snapshot, complete schedule tuple validation, UTC ISO normalization, bigint preservation, and frozen snapshot/arrays. Only persistence converters know snake-case fields. Run focused tests; expected GREEN is PASS.

```ts
const attemptStages: Readonly<Record<PublicationAttemptRecordStage, PublicationAttemptStage>> = {
  STARTING: PublicationAttemptStage.Starting,
  UPLOADING: PublicationAttemptStage.Uploading,
  OUTCOME_UNCERTAIN: PublicationAttemptStage.OutcomeUncertain,
  RECONCILING: PublicationAttemptStage.Reconciling,
  POLLING: PublicationAttemptStage.Polling,
  THUMBNAIL: PublicationAttemptStage.Thumbnail,
  COMPLETED: PublicationAttemptStage.Completed,
  FAILED: PublicationAttemptStage.Failed,
  CANCELLED: PublicationAttemptStage.Cancelled,
};

const freezeMetadata = (value: unknown): PublishingMetadataEntityDto =>
  Object.freeze(parsePublishingMetadata(value));
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publication.converter.test.ts src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.test.ts
```

- [ ] **REFACTOR 2.4 — Keep error sanitization separate from conversion.**

Converters copy only already-sanitized error strings. They must not parse provider error bodies or resumable-session query parameters. Rerun tests and architecture checks.

```ts
sanitizedErrorCode: record.sanitized_error_code,
sanitizedErrorMessage: record.sanitized_error_message,
resumableSessionReference: record.resumable_session_reference,
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.test.ts
pnpm test:architecture
```

## RED-GREEN-REFACTOR cycle 3: two isolated data services

- [ ] **RED 3.1 — Write independent data-service tests.**

Create `publication-data-services.test.ts` with two tests:

```ts
it('publication data service returns the existing idempotent row', async () => {
  const publicationRepository = makePublicationRepositoryFake({
    findByIdempotencyKey: makePublicationRecord(),
  });
  const service = new PublicationDataService(publicationRepository);
  await expect(service.findByIdempotencyKey('publish:clip-1:primary:1'))
    .resolves.toMatchObject({ idempotencyKey: 'publish:clip-1:primary:1' });
});

it('attempt data service does not decrease acknowledged progress', async () => {
  const attemptRepository = makePublicationAttemptRepositoryFake({
    saveProgress: makePublicationAttemptRecord({
      acknowledged_bytes: 700n,
      total_bytes: 1_000n,
      progress_percent: 70,
    }),
  });
  const service = new PublicationAttemptDataService(attemptRepository);
  await expect(service.saveProgress(makeAttemptProgressEntity({ acknowledgedBytes: 600n })))
    .resolves.toMatchObject({ acknowledgedBytes: 700n, progressPercent: 70 });
});
```

- [ ] **RED 3.2 — Witness missing data services.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publication-data-services.test.ts
```

Expected RED: data-service signature shells collect; stale progress returns `600n` instead of retaining the repository's monotonic `700n` offset.

- [ ] **GREEN 3.3 — Implement table-scoped mapping.**

`PublicationDataService` imports only `PublicationRepositoryPort`; `PublicationAttemptDataService` imports only `PublicationAttemptRepositoryPort`. Concrete Prisma adapters are injected in composition. Each delegates persistence operations and converts Record/Entity DTOs. They map not-found and unique-conflict outcomes to typed data errors but contain no state-transition, schedule, retry, or workflow logic.

Run focused tests. Expected GREEN: PASS.

```ts
export class PublicationDataService {
  constructor(private readonly repository: PublicationRepositoryPort) {}

  async findByIdempotencyKey(key: string): Promise<PublicationEntityDto | null> {
    const record = await this.repository.findByIdempotencyKey(key);
    return record ? publicationRecordToEntity(record) : null;
  }
}

export class PublicationAttemptDataService {
  constructor(private readonly repository: PublicationAttemptRepositoryPort) {}

  async saveProgress(input: PublicationAttemptProgressEntityDto): Promise<PublicationAttemptEntityDto> {
    return publicationAttemptRecordToEntity(
      await this.repository.saveProgress(publicationAttemptProgressEntityToRecord(input)),
    );
  }
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publication-data-services.test.ts
```

- [ ] **REFACTOR 3.4 — Prove repository/data-service isolation.**

Create `publication-data-services.architecture.test.ts`:

```ts
import { readFile } from 'node:fs/promises';

import { expect, it } from 'vitest';

it.each([
  ['publication.data-service.ts', 'publication.repository'],
  ['publication-attempt.data-service.ts', 'publication-attempt.repository'],
] as const)('%s imports only %s', async (file, expectedRepository) => {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    `../ports/${expectedRepository}`,
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publication-data-services.architecture.test.ts
pnpm test:architecture
```

## Broader verification

- [ ] Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publication.converter.test.ts src/modules/youtube-publishing/converters/entity-record/publication-attempt.converter.test.ts src/modules/youtube-publishing/application/data-services/publication-data-services.test.ts
pnpm exec vitest run tests/integration/youtube-publishing/publication-repositories.test.ts
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm pre-final retries append bounded attempt rows under one publication; an uncertain post-final attempt cannot append a replacement until reconciliation and explicit duplicate-risk acknowledgement, and local records do not claim one `youtubeVideoId` when YouTube returned none.
- [ ] Confirm unverified scheduled rows and private rows with `publishAt` are impossible even through direct SQL.

## Review gate

Approve only when uniqueness and schedule/private constraints are database-enforced, progress cannot regress, snapshots and timezones round-trip, remote identity is all-or-none, and both persistence boundaries stay isolated.

## Suggested commit

```text
feat(youtube): persist publication attempts idempotently
```
