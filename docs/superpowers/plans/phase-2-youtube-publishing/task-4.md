# Task 4: Versioned Metadata Draft Persistence and AI-Usage Linkage

> **Implementation mode:** Complete after Tasks 1–2. This task owns only `publishing_metadata_drafts`; it may add the required FK relation to Phase 1 `AIUsageEvent`, but it must not add publishing fields to a core Entity DTO.

## Purpose

Store every manual or OpenAI-generated publishing-metadata version, its approval lifecycle, model/reasoning/estimate/actual-cost provenance, and an exact optional `AIUsageEvent` link. Regeneration creates a new row; it never overwrites an earlier reviewed version.

## Requirements and traceability

- YouTube design §§5–6: editable fields, per-clip paid generation, conservative estimate/cap, manual zero cost, versioning, no silent overwrite, approval.
- YouTube design §§13, 17–19: `PublishingMetadataDraft`, exact `AIUsageEvent`, converter money/nullability coverage.
- Core design §§13.5, 19, 30.2–30.7: immutable usage events, decimal-safe money, boundary DTOs, table-scoped repositories.

## Clean Architecture ownership

- **Affected layers:** Entity DTO, Record DTO, entity-record converter, one repository, one data service.
- **Owned table:** `publishing_metadata_drafts` only.
- **Boundary:** `PublishingMetadataDraftEntityDto <-> PublishingMetadataDraftRecordDto`.
- **Cross-module reference:** `ai_usage_event_id` points to the existing Phase 1 `ai_usage_events` row; no Phase 1 application type gains a publishing property.

## Files

- Create: `prisma/migrations/20260712000200_phase_2_publishing_metadata_drafts/migration.sql`
- Modify: `prisma/schema.prisma`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/dto/record/publishing-metadata-draft-record.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/publishing-metadata-draft.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publishing-metadata-draft.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/publishing-metadata-draft.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publishing-metadata-draft.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.architecture.test.ts`
- Create: `tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`

## Prerequisites

- Tasks 1–2 green.
- Phase 1 `clips` and `ai_usage_events` tables and IDs are accepted.
- Phase 1 migration chain plus Task 3 migration applies cleanly to disposable PostgreSQL.

## Interfaces

Application-owned `PublishingMetadataDraftRepositoryPort`:

```ts
export type InsertPublishingMetadataDraftEntityDto = Omit<
  PublishingMetadataDraftEntityDto,
  'createdAt' | 'updatedAt'
>;

export interface PublishingMetadataDraftRepositoryPort {
  findById(id: PublishingMetadataDraftId): Promise<PublishingMetadataDraftEntityDto | null>;
  findLatestForClip(clipId: ClipId): Promise<PublishingMetadataDraftEntityDto | null>;
  listForClip(clipId: ClipId): Promise<readonly PublishingMetadataDraftEntityDto[]>;
  insertVersion(input: InsertPublishingMetadataDraftEntityDto): Promise<PublishingMetadataDraftEntityDto>;
  updateEditableRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    metadata: PublishingMetadataEntityDto,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
  updateStateRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    state: MetadataDraftState,
    approvedAt: Date | null,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
}
```

`version` is immutable history ordering. Only `expectedRevision` participates in optimistic concurrency; `revision integer not null default 1` increments on every accepted edit/state change.

## RED-GREEN-REFACTOR cycle 1: schema, constraints, and historical versions

- [ ] **RED 1.1 — Write the repository test before the migration.**

Create `publishing-metadata-draft.repository.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaPublishingMetadataDraftRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publishing-metadata-draft.repository';
import { createMigratedTestDatabase } from '../support/postgres';
import { seedClip, seedProject } from '../support/seed-core';

describe('PrismaPublishingMetadataDraftRepository', () => {
  const database = createMigratedTestDatabase();
  beforeAll(async () => {
    await database.start();
    await seedProject(database, '018f4f2c-93d7-7c75-8f0f-7f5165e8bb50');
    await seedClip(database, {
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb51',
      projectId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb50',
    });
  });
  afterAll(() => database.stop());

  it('keeps an earlier approved draft when regeneration inserts version two', async () => {
    const repository = new PrismaPublishingMetadataDraftRepository(database.prisma);
    const first = await repository.insertVersion(makeDraftEntity({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52',
      version: 1,
      state: 'APPROVED',
      source: 'MANUAL',
      aiUsageEventId: null,
      actualCostMicrousd: 0n,
    }));
    const second = await repository.insertVersion(makeDraftEntity({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb53',
      version: 2,
      state: 'AWAITING_APPROVAL',
      source: 'OPENAI',
      aiUsageEventId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54',
      actualCostMicrousd: 12_345n,
    }));

    expect(first.state).toBe('APPROVED');
    expect(second.version).toBe(2);
    await expect(repository.listForClip(first.clipId)).resolves.toHaveLength(2);
  });

  it('rejects duplicate clip version and negative money', async () => {
    await expect(
      database.query(
        `insert into publishing_metadata_drafts
           (id, project_id, clip_id, version, revision, state, source, title, description,
            hashtags, keyword_tags, category_id, default_language, made_for_kids,
            contains_synthetic_media, estimated_cost_microusd, actual_cost_microusd)
         select '018f4f2c-93d7-7c75-8f0f-7f5165e8bb59', project_id, clip_id, 1, 1,
                'METADATA_DRAFT', 'MANUAL',
                'title', '', '[]', '[]', '22', 'en', false, false, -1, 0
         from publishing_metadata_drafts limit 1`,
      ),
    ).rejects.toBeDefined();
  });
});
```

The test builder must insert a complete Phase 1 `AIUsageEvent` with purpose `YOUTUBE_METADATA_GENERATION` before referencing its ID; do not disable the FK.

- [ ] **RED 1.2 — Witness the missing table/repository.**

```bash
pnpm exec vitest run tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts
```

Expected RED: apply the RED schema/repository shells first; inserting the same `(clip_id, version)` twice succeeds instead of raising `publishing_metadata_drafts_clip_version_key`. Missing relation/import failure is not accepted.

- [ ] **GREEN 1.3 — Add the exact additive schema.**

Create `migration.sql`:

```sql
create table "publishing_metadata_drafts" (
  "id" uuid primary key,
  "project_id" uuid not null references "projects" ("id") on delete cascade,
  "clip_id" uuid not null references "clips" ("id") on delete cascade,
  "version" integer not null,
  "revision" integer not null default 1,
  "state" text not null,
  "source" text not null,
  "title" text not null,
  "description" text not null,
  "hashtags" jsonb not null,
  "keyword_tags" jsonb not null,
  "category_id" text not null,
  "default_language" text not null,
  "made_for_kids" boolean not null,
  "contains_synthetic_media" boolean not null,
  "publishing_instruction" text,
  "model_id" text,
  "reasoning_level" text,
  "max_cost_microusd" bigint not null default 0,
  "estimated_cost_microusd" bigint not null default 0,
  "actual_cost_microusd" bigint not null default 0,
  "ai_usage_event_id" uuid references "ai_usage_events" ("id") on delete restrict,
  "approved_at" timestamptz,
  "superseded_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "publishing_metadata_drafts_version_check" check ("version" > 0),
  constraint "publishing_metadata_drafts_revision_check" check ("revision" > 0),
  constraint "publishing_metadata_drafts_state_check" check (
    "state" in ('METADATA_DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SUPERSEDED')
  ),
  constraint "publishing_metadata_drafts_source_check" check ("source" in ('MANUAL', 'OPENAI')),
  constraint "publishing_metadata_drafts_json_check" check (
    jsonb_typeof("hashtags") = 'array' and jsonb_typeof("keyword_tags") = 'array'
  ),
  constraint "publishing_metadata_drafts_money_check" check (
    "max_cost_microusd" >= 0 and "estimated_cost_microusd" >= 0 and "actual_cost_microusd" >= 0
  ),
  constraint "publishing_metadata_drafts_manual_cost_check" check (
    "source" <> 'MANUAL' or (
      "model_id" is null and "reasoning_level" is null and
      "ai_usage_event_id" is null and "actual_cost_microusd" = 0
    )
  ),
  constraint "publishing_metadata_drafts_openai_provenance_check" check (
    "source" <> 'OPENAI' or ("model_id" is not null and "reasoning_level" is not null)
  ),
  constraint "publishing_metadata_drafts_approval_check" check (
    ("state" = 'APPROVED' and "approved_at" is not null) or
    ("state" <> 'APPROVED' and "approved_at" is null)
  )
);

create unique index "publishing_metadata_drafts_clip_version_key"
  on "publishing_metadata_drafts" ("clip_id", "version");

create unique index "publishing_metadata_drafts_ai_usage_event_key"
  on "publishing_metadata_drafts" ("ai_usage_event_id")
  where "ai_usage_event_id" is not null;

create index "publishing_metadata_drafts_project_clip_created_idx"
  on "publishing_metadata_drafts" ("project_id", "clip_id", "created_at" desc);
```

Add the matching Prisma model with explicit mapped names and relations. The reverse Prisma relation on `AIUsageEvent` is persistence-only and is not added to `AIUsageEventEntityDto`. The Prisma adapter owns the complete snake-case Record DTO, distinct state/source unions, and Entity↔Record converter. Its Entity-oriented port implementation uses explicit selects and optimistic predicates `{ id, revision }`; successful edit increments `revision` by one. Record/Prisma values never appear in the application port.

Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm exec vitest run tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts
```

Expected GREEN: PASS with both versions present, constraints enforced, and the AI usage FK active.

- [ ] **REFACTOR 1.4 — Keep version and revision semantics distinct.**

Name methods `insertVersion` and `updateEditableRevision`; never update `version`. Append this repository test before renaming:

```ts
it('rejects a stale editable revision without overwriting the winner', async () => {
  const repository = new PrismaPublishingMetadataDraftRepository(database.prisma);
  const draft = await repository.insertVersion(makeDraftEntity({ version: 7, revision: 1 }));
  await expect(
    repository.updateEditableRevision(draft.id, 1, makePublishingMetadataEntity({ title: 'Winner' })),
  ).resolves.toMatchObject({ revision: 2, metadata: { title: 'Winner' } });
  await expect(
    repository.updateEditableRevision(draft.id, 1, makePublishingMetadataEntity({ title: 'Stale' })),
  ).resolves.toBeNull();
  await expect(repository.findById(draft.id)).resolves.toMatchObject({
    version: 7,
    revision: 2,
    metadata: { title: 'Winner' },
  });
});
```

Witness RED on missing renamed methods, implement the guarded `updateMany({ where: { id, revision } })`, and rerun the repository test; expected GREEN is PASS.

## RED-GREEN-REFACTOR cycle 2: explicit conversion including money and optional provenance

- [ ] **RED 2.1 — Write generated/manual and malformed conversion tests.**

Create `publishing-metadata-draft.converter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { MetadataDraftState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import { metadataDraftRecordToEntity } from './publishing-metadata-draft.converter';

describe('metadataDraftRecordToEntity', () => {
  it('maps OpenAI provenance and bigint micro-USD exactly', () => {
    const record = makePublishingMetadataDraftRecord({
      source: 'OPENAI',
      state: 'AWAITING_APPROVAL',
      model_id: 'gpt-5.6-sol',
      reasoning_level: 'high',
      estimated_cost_microusd: 20_000n,
      actual_cost_microusd: 12_345n,
      ai_usage_event_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54',
    });
    expect(metadataDraftRecordToEntity(record)).toMatchObject({
      state: MetadataDraftState.AwaitingApproval,
      source: 'OPENAI',
      estimatedCostMicrousd: 20_000n,
      actualCostMicrousd: 12_345n,
      aiUsageEventId: record.ai_usage_event_id,
    });
  });

  it('rejects an unknown record state', () => {
    const record = makePublishingMetadataDraftRecord({ state: 'PUBLISHED' as never });
    expect(() => metadataDraftRecordToEntity(record)).toThrow(
      'unknown publishing metadata draft state PUBLISHED',
    );
  });

  it('rejects invalid JSON array values instead of casting them', () => {
    const record = makePublishingMetadataDraftRecord({ hashtags: { tag: '#bad' } as never });
    expect(() => metadataDraftRecordToEntity(record)).toThrow('hashtags must be a string array');
  });
});
```

- [ ] **RED 2.2 — Witness missing conversion.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publishing-metadata-draft.converter.test.ts
```

Expected RED: the converter signature shell collects; invalid object-valued `hashtags` is accepted instead of throwing `hashtags must be a string array`.

- [ ] **GREEN 2.3 — Implement both explicit directions.**

Implement `metadataDraftRecordToEntity` and `metadataDraftEntityToRecord` with exhaustive state maps, source validation, string-array guards, bigint preservation, branded-ID casts only after UUID validation, and `parsePublishingMetadata` from Task 2. Do not serialize bigint through JSON. Run the focused test; expected GREEN is PASS.

```ts
const recordStates: Readonly<Record<PublishingMetadataDraftRecordState, MetadataDraftState>> = {
  METADATA_DRAFT: MetadataDraftState.Draft,
  AWAITING_APPROVAL: MetadataDraftState.AwaitingApproval,
  APPROVED: MetadataDraftState.Approved,
  SUPERSEDED: MetadataDraftState.Superseded,
};

export function metadataDraftRecordToEntity(
  record: PublishingMetadataDraftRecordDto,
): PublishingMetadataDraftEntityDto {
  const state = recordStates[record.state];
  if (!state) throw new Error(`unknown metadata draft state ${record.state}`);
  return Object.freeze({
    id: parsePublishingMetadataDraftId(record.id),
    projectId: parseProjectId(record.project_id),
    clipId: parseClipId(record.clip_id),
    version: record.version,
    revision: record.revision,
    source: parseMetadataDraftSource(record.source),
    state,
    metadata: parsePublishingMetadata({
      title: record.title,
      description: record.description,
      hashtags: parseStringArray(record.hashtags, 'hashtags'),
      keywordTags: parseStringArray(record.keyword_tags, 'keywordTags'),
      categoryId: record.category_id,
      defaultLanguage: record.default_language,
      madeForKids: record.made_for_kids,
      containsSyntheticMedia: record.contains_synthetic_media,
    }),
    publishingInstruction: record.publishing_instruction,
    modelId: record.model_id,
    reasoningLevel: record.reasoning_level,
    maxCostMicrousd: record.max_cost_microusd,
    estimatedCostMicrousd: record.estimated_cost_microusd,
    actualCostMicrousd: record.actual_cost_microusd,
    aiUsageEventId: record.ai_usage_event_id
      ? parseAIUsageEventId(record.ai_usage_event_id)
      : null,
    approvedAt: record.approved_at,
    supersededAt: record.superseded_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  });
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publishing-metadata-draft.converter.test.ts
```

- [ ] **REFACTOR 2.4 — Isolate JSON-array guards.**

Extract this local guard used only by the converter:

```ts
function parseStringArray(
  value: unknown,
  field: 'hashtags' | 'keywordTags',
): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be a string array`);
  }
  return Object.freeze([...value]);
}
```

Call it for both JSON fields, keep it unexported, and rerun the converter test plus `pnpm test:architecture`; expected GREEN is PASS.

## RED-GREEN-REFACTOR cycle 3: one-repository draft data service

- [ ] **RED 3.1 — Test table-level operations and conflict translation.**

Create `publishing-metadata-draft.data-service.test.ts`:

```ts
import { expect, it, vi } from 'vitest';

import { PublishingMetadataDraftDataService } from './publishing-metadata-draft.data-service';

it('maps a stale edit to a typed revision conflict', async () => {
  const repository = {
    findById: vi.fn(),
    findLatestForClip: vi.fn(),
    listForClip: vi.fn(),
    insertVersion: vi.fn(),
    updateEditableRevision: vi.fn().mockResolvedValue(null),
    updateStateRevision: vi.fn(),
  };
  const service = new PublishingMetadataDraftDataService(repository);

  await expect(
    service.updateEditableRevision(
      '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52',
      1,
      makePublishingMetadataEntity(),
    ),
  ).rejects.toMatchObject({ code: 'METADATA_DRAFT_REVISION_CONFLICT' });
});
```

- [ ] **RED 3.2 — Witness missing service.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.test.ts
```

Expected RED: the data-service signature shell collects; a null optimistic update throws `NOT_IMPLEMENTED:updateEditableRevision` instead of `METADATA_DRAFT_REVISION_CONFLICT`.

- [ ] **GREEN 3.3 — Implement table-level mapping only.**

The data service imports exactly Entity-oriented `PublishingMetadataDraftRepositoryPort` and typed data errors. `PrismaPublishingMetadataDraftRepository`, Record DTO, and converter are wired/used only behind the adapter in composition. The service delegates six repository methods and maps `null` optimistic updates to `MetadataDraftRevisionConflictDataError`. It does not choose versions, approve, supersede, call OpenAI, or write `AIUsageEvent`.

Run the focused test. Expected GREEN: PASS.

```ts
async updateEditableRevision(
  id: PublishingMetadataDraftId,
  expectedRevision: number,
  metadata: PublishingMetadataEntityDto,
): Promise<PublishingMetadataDraftEntityDto> {
  const draft = await this.repository.updateEditableRevision(id, expectedRevision, metadata);
  if (!draft) throw new MetadataDraftRevisionConflictDataError(id, expectedRevision);
  return draft;
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.test.ts
```

- [ ] **REFACTOR 3.4 — Prove one-repository ownership.**

Create `publishing-metadata-draft.data-service.architecture.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('imports one application repository port and no adapter', async () => {
  const source = await readFile(
    new URL('./publishing-metadata-draft.data-service.ts', import.meta.url),
    'utf8',
  );
  expect(source).toContain("from '../ports/publishing-metadata-draft.repository'");
  expect(source).not.toMatch(/from ['"].*\/adapters\//u);
  expect(source).not.toMatch(/connection\.repository|publication\.repository/u);
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.architecture.test.ts
pnpm test:architecture
```

## Broader verification

- [ ] Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/publishing-metadata-draft.converter.test.ts src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.test.ts
pnpm exec vitest run tests/integration/youtube-publishing/publishing-metadata-draft.repository.test.ts
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm manual rows cannot persist nonzero actual cost or an AI usage link.
- [ ] Confirm OpenAI rows retain model/reasoning and the exact linked usage event while old versions remain queryable.

## Review gate

Approve only when history is append-only by version, editable revisions are concurrency-safe, money is exact bigint micro-USD, manual cost is database-enforced zero, AI usage has an active FK, and no Phase 1 Entity DTO was expanded.

## Suggested commit

```text
feat(youtube): persist versioned metadata drafts
```
