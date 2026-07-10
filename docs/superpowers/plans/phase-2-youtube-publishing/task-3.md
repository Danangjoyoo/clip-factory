# Task 3: YouTube Connection Persistence Boundary

> **Implementation mode:** Complete after Tasks 1–2. This task owns only the `youtube_connections` table, its Record DTO/converter/repository/data service, and their tests.

## Purpose

Persist one channel slot's nonsecret identity, scope names, health, OAuth testing warning, refresh-token expiry metadata, and revocation uncertainty without ever creating a credential-shaped column or value.

## Requirements and traceability

- YouTube design §§7, 9–10: one channel, exact scopes, nonsecret PostgreSQL fields, `REAUTH_REQUIRED`, testing expiry warning, reconnect/disconnect history.
- YouTube design §§13, 16, 18–19: `YouTubeConnection`, local credential absence, one-table repository/data-service boundary.
- Core design §§19, 25, 30.2–30.7: typed columns/constraints/indexes, reviewed migration, Record/Entity separation.

## Clean Architecture ownership

- **Affected layers:** application Entity DTO, data service, persistence adapter, entity-record converter.
- **Owned boundary:** `YouTubeConnectionEntityDto <-> YouTubeConnectionRecordDto`.
- **Owned table:** `youtube_connections` only.
- **Repository rule:** application owns Entity-oriented `YouTubeConnectionRepositoryPort`; `PrismaYouTubeConnectionRepository` owns its Record DTO/converter internally and imports no other repository.
- **Data-service rule:** `YouTubeConnectionDataService` imports exactly the application-owned repository port, never the persistence adapter, and exposes only Entity DTOs.

## Files

- Create: `prisma/migrations/20260712000100_phase_2_youtube_connection/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/dto/record/youtube-connection-record.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/youtube-connection.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/youtube-connection.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/entity-record/youtube-connection.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-youtube-connection.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.architecture.test.ts`
- Create: `apps/web/src/test-utils/youtube-publishing-builders.ts`
- Create: `tests/integration/youtube-publishing/youtube-connection.repository.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`

Never modify a Phase 1 migration. This is the first additive Phase 2 migration.

## Prerequisites

- Complete Phase 1 migration history through its final accepted UTC directory.
- Tasks 1–2 green.
- Disposable PostgreSQL integration harness from Phase 1 available.

## Interfaces

Add to the Entity DTO file:

```ts
export type YouTubeConnectionEntityDto = {
  id: YouTubeConnectionId;
  channelId: string;
  channelTitle: string;
  channelHandle: string | null;
  avatarUrl: string | null;
  grantedScopes: readonly string[];
  state: YouTubeConnectionState;
  oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refreshTokenExpiresAt: Date | null;
  healthCheckedAt: Date | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  revocationUncertain: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

`YouTubeConnectionDataService` produces:

```ts
export type ConnectedChannelInput = Omit<
  YouTubeConnectionEntityDto,
  'state' | 'connectedAt' | 'disconnectedAt' | 'revocationUncertain' | 'createdAt' | 'updatedAt'
>;

export interface YouTubeConnectionDataServiceContract {
  getPrimary(): Promise<YouTubeConnectionEntityDto | null>;
  saveConnected(input: ConnectedChannelInput): Promise<YouTubeConnectionEntityDto>;
  markReauthRequired(id: YouTubeConnectionId): Promise<YouTubeConnectionEntityDto>;
  disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto>;
}

export interface YouTubeConnectionRepositoryPort {
  findPrimary(): Promise<YouTubeConnectionEntityDto | null>;
  upsertConnected(input: ConnectedChannelInput): Promise<YouTubeConnectionEntityDto>;
  updateState(
    id: YouTubeConnectionId,
    state: YouTubeConnectionState,
  ): Promise<YouTubeConnectionEntityDto | null>;
  disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto | null>;
}
```

## RED-GREEN-REFACTOR cycle 1: migration constraints and credential absence

- [ ] **RED 1.1 — Write the disposable-PostgreSQL test first.**

Create `tests/integration/youtube-publishing/youtube-connection.repository.test.ts` using the Phase 1 database harness:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMigratedTestDatabase } from '../support/postgres';
import { PrismaYouTubeConnectionRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-youtube-connection.repository';

describe('PrismaYouTubeConnectionRepository', () => {
  const database = createMigratedTestDatabase();

  beforeAll(() => database.start());
  afterAll(() => database.stop());

  it('persists only nonsecret channel metadata in the primary slot', async () => {
    const repository = new PrismaYouTubeConnectionRepository(database.prisma);
    await repository.upsertConnected({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
      channelId: 'UC-safe-channel',
      channelTitle: 'Clip Factory Test',
      channelHandle: '@clipfactorytest',
      avatarUrl: 'https://yt3.ggpht.com/safe-avatar',
      grantedScopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      oauthMode: 'TESTING',
      refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
      healthCheckedAt: new Date('2026-07-11T00:00:00.000Z'),
    });

    await expect(repository.findPrimary()).resolves.toMatchObject({
      channelId: 'UC-safe-channel',
      state: YouTubeConnectionState.Connected,
    });
  });

  it('has no credential-shaped columns', async () => {
    const rows = await database.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public' and table_name = 'youtube_connections'`,
    );
    expect(rows.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining([
        'access_token',
        'refresh_token',
        'authorization_code',
        'code_verifier',
        'client_secret',
      ]),
    );
  });

  it('allows only one primary slot', async () => {
    await expect(
      database.query(
        `insert into youtube_connections
           (id, slot, channel_id, channel_title, granted_scopes, state, oauth_mode)
         values
           ('018f4f2c-93d7-7c75-8f0f-7f5165e8bb47', 'PRIMARY', 'UC-other', 'Other', '[]', 'CONNECTED', 'UNKNOWN')`,
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
```

- [ ] **RED 1.2 — Witness the missing table/repository.**

Run:

```bash
pnpm exec vitest run tests/integration/youtube-publishing/youtube-connection.repository.test.ts
```

Expected RED: apply the RED schema shell first; the second `PRIMARY` insert succeeds instead of raising the named unique-slot constraint. A missing relation or unresolved repository import is not accepted.

- [ ] **GREEN 1.3 — Add the reviewed migration and matching Prisma model.**

Create `migration.sql`:

```sql
create table "youtube_connections" (
  "id" uuid primary key,
  "slot" text not null default 'PRIMARY',
  "channel_id" text not null,
  "channel_title" text not null,
  "channel_handle" text,
  "avatar_url" text,
  "granted_scopes" jsonb not null,
  "state" text not null,
  "oauth_mode" text not null,
  "refresh_token_expires_at" timestamptz,
  "health_checked_at" timestamptz,
  "connected_at" timestamptz,
  "disconnected_at" timestamptz,
  "revocation_uncertain" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "youtube_connections_slot_check" check ("slot" = 'PRIMARY'),
  constraint "youtube_connections_state_check" check (
    "state" in ('DISCONNECTED', 'CONNECTED', 'REAUTH_REQUIRED')
  ),
  constraint "youtube_connections_oauth_mode_check" check (
    "oauth_mode" in ('TESTING', 'PRODUCTION', 'UNKNOWN')
  ),
  constraint "youtube_connections_scopes_array_check" check (
    jsonb_typeof("granted_scopes") = 'array'
  )
);

create unique index "youtube_connections_slot_key"
  on "youtube_connections" ("slot");

create unique index "youtube_connections_channel_id_key"
  on "youtube_connections" ("channel_id");

create index "youtube_connections_state_health_idx"
  on "youtube_connections" ("state", "health_checked_at" desc);
```

Map all columns explicitly in `prisma/schema.prisma` with `@map`/`@@map`, `DateTime @db.Timestamptz(6)`, `Json` for `grantedScopes`, and `String @db.Uuid` for `id`. Do not use a Prisma enum as the shared Entity enum; the repository Record DTO owns string literals matching the database checks.

Create the Record DTO:

```ts
export type YouTubeConnectionRecordState =
  | 'DISCONNECTED'
  | 'CONNECTED'
  | 'REAUTH_REQUIRED';

export type YouTubeConnectionRecordDto = {
  id: string;
  slot: 'PRIMARY';
  channel_id: string;
  channel_title: string;
  channel_handle: string | null;
  avatar_url: string | null;
  granted_scopes: readonly string[];
  state: YouTubeConnectionRecordState;
  oauth_mode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refresh_token_expires_at: Date | null;
  health_checked_at: Date | null;
  connected_at: Date | null;
  disconnected_at: Date | null;
  revocation_uncertain: boolean;
  created_at: Date;
  updated_at: Date;
};
```

Implement the Entity-oriented `YouTubeConnectionRepositoryPort` in `PrismaYouTubeConnectionRepository`. Every Prisma select enumerates the columns above, maps Prisma output to its adapter-owned snake-case Record DTO, and immediately applies the Entity↔Record converter. Neither Prisma nor a Record DTO crosses the adapter boundary.

Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm exec vitest run tests/integration/youtube-publishing/youtube-connection.repository.test.ts
```

Expected GREEN: migration applies after the full Phase 1 chain, all three repository tests PASS, and no credential-shaped column exists.

- [ ] **REFACTOR 1.4 — Inspect the important query/index relationship.**

Run the exact plan and retain the assertion that the table has one row maximum. Do not add a redundant index beyond the unique slot index:

```sql
explain (analyze, buffers)
select id, channel_id, channel_title, state, health_checked_at
from youtube_connections
where slot = 'PRIMARY'
limit 1;

select count(*) <= 1 as primary_slot_invariant
from youtube_connections;
```

```bash
pnpm exec vitest run tests/integration/youtube-publishing/youtube-connection.repository.test.ts
```

## RED-GREEN-REFACTOR cycle 2: explicit Record/Entity conversion

- [ ] **RED 2.1 — Write converter cases before the converter.**

Create `youtube-connection.converter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { YouTubeConnectionState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import { connectionRecordToEntity } from './youtube-connection.converter';

const record = {
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
  slot: 'PRIMARY',
  channel_id: 'UC-safe-channel',
  channel_title: 'Clip Factory Test',
  channel_handle: null,
  avatar_url: null,
  granted_scopes: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ],
  state: 'REAUTH_REQUIRED',
  oauth_mode: 'TESTING',
  refresh_token_expires_at: new Date('2026-07-18T00:00:00.000Z'),
  health_checked_at: null,
  connected_at: new Date('2026-07-11T00:00:00.000Z'),
  disconnected_at: null,
  revocation_uncertain: false,
  created_at: new Date('2026-07-11T00:00:00.000Z'),
  updated_at: new Date('2026-07-11T01:00:00.000Z'),
} as const;

describe('connectionRecordToEntity', () => {
  it('maps enum, nullability, scopes, and UTC timestamps explicitly', () => {
    expect(connectionRecordToEntity(record)).toMatchObject({
      id: record.id,
      channelId: 'UC-safe-channel',
      channelHandle: null,
      state: YouTubeConnectionState.ReauthRequired,
      oauthMode: 'TESTING',
      refreshTokenExpiresAt: record.refresh_token_expires_at,
    });
  });

  it('rejects an unknown persisted state', () => {
    expect(() =>
      connectionRecordToEntity({ ...record, state: 'TOKEN_EXPIRED' as never }),
    ).toThrow('unknown YouTube connection record state TOKEN_EXPIRED');
  });
});
```

- [ ] **RED 2.2 — Run and witness missing converter.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/youtube-connection.converter.test.ts
```

Expected RED: the converter signature shell collects; the REAUTH record throws `NOT_IMPLEMENTED:connectionRecordToEntity` instead of mapping to `YouTubeConnectionState.ReauthRequired`.

- [ ] **GREEN 2.3 — Implement exhaustive conversion.**

Create `youtube-connection.converter.ts`:

```ts
import {
  YouTubeConnectionState,
  type YouTubeConnectionEntityDto,
  type YouTubeConnectionId,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import type {
  YouTubeConnectionRecordDto,
  YouTubeConnectionRecordState,
} from '../../adapters/persistence/dto/record/youtube-connection-record.dto';

const states: Readonly<Record<YouTubeConnectionRecordState, YouTubeConnectionState>> = {
  DISCONNECTED: YouTubeConnectionState.Disconnected,
  CONNECTED: YouTubeConnectionState.Connected,
  REAUTH_REQUIRED: YouTubeConnectionState.ReauthRequired,
};

export function connectionRecordToEntity(
  record: YouTubeConnectionRecordDto,
): YouTubeConnectionEntityDto {
  const state = states[record.state];
  if (!state) throw new Error(`unknown YouTube connection record state ${record.state}`);
  return {
    id: record.id as YouTubeConnectionId,
    channelId: record.channel_id,
    channelTitle: record.channel_title,
    channelHandle: record.channel_handle,
    avatarUrl: record.avatar_url,
    grantedScopes: Object.freeze([...record.granted_scopes]),
    state,
    oauthMode: record.oauth_mode,
    refreshTokenExpiresAt: record.refresh_token_expires_at,
    healthCheckedAt: record.health_checked_at,
    connectedAt: record.connected_at,
    disconnectedAt: record.disconnected_at,
    revocationUncertain: record.revocation_uncertain,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
```

Add the reverse `connectionEntityToRecord` with an explicit reverse enum map. Append this exhaustive test; it makes every Entity-state mapping and the copied-array behavior reviewable:

```ts
it.each([
  [YouTubeConnectionState.Disconnected, 'DISCONNECTED'],
  [YouTubeConnectionState.Connected, 'CONNECTED'],
  [YouTubeConnectionState.ReauthRequired, 'REAUTH_REQUIRED'],
] as const)('maps Entity state %s to Record state %s', (entityState, recordState) => {
  const entity = connectionRecordToEntity({ ...record, state: recordState });
  const converted = connectionEntityToRecord({ ...entity, state: entityState });
  expect(converted.state).toBe(recordState);
  expect(converted.granted_scopes).toEqual(entity.grantedScopes);
  expect(converted.granted_scopes).not.toBe(entity.grantedScopes);
});
```

Run the focused test. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Keep the converter pair focused.**

Do not create a generic case converter or share Record/Entity enums. Retain this local copy at both conversion boundaries so callers cannot mutate persisted meaning:

```ts
grantedScopes: Object.freeze([...record.granted_scopes]),
// reverse direction
granted_scopes: Object.freeze([...entity.grantedScopes]),
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/youtube-connection.converter.test.ts
pnpm test:architecture
```

## RED-GREEN-REFACTOR cycle 3: one-repository data service

- [ ] **RED 3.1 — Write data-service behavior first.**

Create `youtube-connection.data-service.test.ts` with a typed fake implementing only the repository methods:

```ts
import { expect, it, vi } from 'vitest';

import { YouTubeConnectionState } from '../dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionDataService } from './youtube-connection.data-service';

it('marks invalid_grant as reauth required without deleting channel history', async () => {
  const connection = makeYouTubeConnectionEntity({ state: YouTubeConnectionState.Connected });
  const repository = {
    findPrimary: vi.fn(),
    upsertConnected: vi.fn(),
    updateState: vi.fn().mockResolvedValue({
      ...connection,
      state: YouTubeConnectionState.ReauthRequired,
    }),
    disconnect: vi.fn(),
  };
  const service = new YouTubeConnectionDataService(repository);

  await expect(service.markReauthRequired(connection.id)).resolves.toMatchObject({
    channelId: connection.channelId,
    state: YouTubeConnectionState.ReauthRequired,
  });
  expect(repository.updateState).toHaveBeenCalledWith(
    connection.id,
    YouTubeConnectionState.ReauthRequired,
  );
});
```

Place complete typed `makeYouTubeConnectionRecord` and `makeYouTubeConnectionEntity` builders in `apps/web/src/test-utils/youtube-publishing-builders.ts`. The Record builder is adapter/converter-test-only, spells out every Record DTO property shown in RED 2.1, and never enters the application data-service fake. Tests still assert the fields relevant to the behavior under test.

- [ ] **RED 3.2 — Witness the missing data service.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.test.ts
```

Expected RED: the data-service signature shell collects; `markReauthRequired` throws `NOT_IMPLEMENTED:markReauthRequired` instead of returning the retained channel identity in `ReauthRequired` state.

- [ ] **GREEN 3.3 — Implement the four table-level operations.**

`YouTubeConnectionDataService` constructor accepts `Pick<YouTubeConnectionRepositoryPort, 'findPrimary' | 'upsertConnected' | 'updateState' | 'disconnect'>`, imports that one Entity-oriented application port, and throws `YouTubeConnectionNotFoundDataError` when update/disconnect returns no Entity. It imports no converter or adapter and contains no OAuth, revocation, refresh, or reconnect workflow policy.

```ts
export class YouTubeConnectionDataService {
  constructor(
    private readonly repository: Pick<
      YouTubeConnectionRepositoryPort,
      'findPrimary' | 'upsertConnected' | 'updateState' | 'disconnect'
    >,
  ) {}

  async getPrimary(): Promise<YouTubeConnectionEntityDto | null> {
    return this.repository.findPrimary();
  }

  async markReauthRequired(id: YouTubeConnectionId): Promise<YouTubeConnectionEntityDto> {
    const connection = await this.repository.updateState(id, YouTubeConnectionState.ReauthRequired);
    if (!connection) throw new YouTubeConnectionNotFoundDataError(id);
    return connection;
  }
}
```

Implement `saveConnected` and `disconnect` with the identical null-check/conversion pattern, then run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Enforce the one-repository boundary.**

Create `youtube-connection.data-service.architecture.test.ts`:

```ts
import { readFile } from 'node:fs/promises';

import { expect, it } from 'vitest';

it('imports exactly its repository and no service, controller, or client', async () => {
  const source = await readFile(
    new URL('./youtube-connection.data-service.ts', import.meta.url),
    'utf8',
  );
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  expect(imports.filter((path) => path.includes('/ports/'))).toEqual([
    '../ports/youtube-connection.repository',
  ]);
  expect(imports.some((path) => path.includes('/adapters/'))).toBe(false);
  expect(imports.filter((path) => /\/(services|controllers?|clients?)\//.test(path))).toEqual([]);
});
```

Rerun this file, the focused data-service test, and `pnpm test:architecture`.

## Broader verification

- [ ] Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/entity-record/youtube-connection.converter.test.ts src/modules/youtube-publishing/application/data-services/youtube-connection.data-service.test.ts
pnpm exec vitest run tests/integration/youtube-publishing/youtube-connection.repository.test.ts
pnpm test:architecture
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Inspect the generated migration diff and confirm it is additive and contains no Phase 1 table alteration.
- [ ] Query `information_schema.columns` and confirm no credential-shaped column exists anywhere in `youtube_connections`.

## Review gate

Approve only when a connected channel survives database restart as nonsecret metadata, a missing/unknown state fails explicitly, testing expiry and revocation uncertainty round-trip, and repository/data-service ownership is mechanically enforced.

## Suggested commit

```text
feat(youtube): persist nonsecret channel connection state
```
