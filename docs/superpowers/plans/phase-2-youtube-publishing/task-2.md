# Task 2: Publishing Domain Policy and Entity DTOs

> **Implementation mode:** Complete after Task 1 and the hard Phase 1 gate. This task is pure TypeScript policy; it performs no I/O and imports no framework or adapter.

## Purpose

Create one authoritative implementation for YouTube metadata limits, Shorts eligibility, timezone normalization, private-first scheduling, and publication-state transitions. Later services, APIs, adapters, and UI must call these policies rather than reimplementing them.

## Requirements and traceability

- YouTube design §§4–6: 9:16, 180-second eligibility; title/description/hashtags/tags/category/language/audience/synthetic-media rules.
- YouTube design §§11–14: upload preconditions, independent schedules, private `publishAt`, canonical states, cancellation semantics.
- YouTube design §§18–19: timezone acceptance, unverified-project lockout, explicit value objects and exhaustive transitions.
- Core design §§19, 30.2, 30.5–30.7: explicit identifiers/time/money/state types and pure domain tests.

## Clean Architecture ownership

- **Affected layers:** domain and application Entity DTOs.
- **Owned boundaries:** Entity-only IDs/enums/DTOs; domain value-object constructors and state policy.
- **Forbidden imports:** React, Next.js, Prisma, Temporal, Google/OpenAI SDKs, HTTP DTOs, Record DTOs, UI models.
- **Port ownership:** none; all functions are pure.

## Files

- Create: `apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publishing-metadata.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publishing-metadata.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publishing-schedule.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publishing-schedule.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/upload-eligibility.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/upload-eligibility.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publication-state.ts`
- Create: `apps/web/src/modules/youtube-publishing/domain/publication-state.test.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

## Prerequisites

- Task 1 generated contracts and architecture rules pass.
- Inspect Phase 1 branded-ID and typed-error conventions; use the same helper without adding publishing fields to core Entity DTOs.

## Interfaces produced

`youtube-publishing-entity.dto.ts` owns these distinct application types:

```ts
import type {
  AIUsageEventId,
  ClipId,
  ProjectId,
  RenderId,
  WorkflowId,
} from '@/shared/domain';

export type YouTubeConnectionId = string & {
  readonly __brand: 'YouTubeConnectionId';
};
export type PublishingMetadataDraftId = string & {
  readonly __brand: 'PublishingMetadataDraftId';
};
export type PublicationId = string & { readonly __brand: 'PublicationId' };
export type PublicationAttemptId = string & {
  readonly __brand: 'PublicationAttemptId';
};

export enum YouTubeConnectionState {
  Disconnected = 'DISCONNECTED',
  Connected = 'CONNECTED',
  ReauthRequired = 'REAUTH_REQUIRED',
}

export enum MetadataDraftState {
  Empty = 'METADATA_EMPTY',
  Draft = 'METADATA_DRAFT',
  AwaitingApproval = 'AWAITING_APPROVAL',
  Approved = 'APPROVED',
  Superseded = 'SUPERSEDED',
}

export enum PublicationState {
  ReadyToUpload = 'READY_TO_UPLOAD',
  Uploading = 'UPLOADING',
  UploadOutcomeUncertain = 'UPLOAD_OUTCOME_UNCERTAIN',
  YouTubeProcessing = 'YOUTUBE_PROCESSING',
  PrivateReview = 'PRIVATE_REVIEW',
  Scheduled = 'SCHEDULED',
  Published = 'PUBLISHED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export enum PublicationVisibility {
  PrivateReview = 'PRIVATE_REVIEW',
  Scheduled = 'SCHEDULED',
}

export type PublishingMetadataEntityDto = {
  title: string;
  description: string;
  hashtags: readonly string[];
  keywordTags: readonly string[];
  categoryId: string;
  defaultLanguage: string;
  madeForKids: boolean;
  containsSyntheticMedia: boolean;
};

export type PublishingScheduleEntityDto = {
  sourceLocalDateTime: string;
  sourceTimezone: string;
  publishAtUtc: string;
};

export type PublishingMetadataDraftEntityDto = {
  id: PublishingMetadataDraftId;
  projectId: ProjectId;
  clipId: ClipId;
  version: number;
  revision: number;
  state: MetadataDraftState;
  source: 'MANUAL' | 'OPENAI';
  metadata: PublishingMetadataEntityDto;
  publishingInstruction: string | null;
  modelId: string | null;
  reasoningLevel: string | null;
  maxCostMicrousd: bigint;
  estimatedCostMicrousd: bigint;
  actualCostMicrousd: bigint;
  aiUsageEventId: AIUsageEventId | null;
  approvedAt: Date | null;
  supersededAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationEntityDto = {
  id: PublicationId;
  projectId: ProjectId;
  clipId: ClipId;
  renderId: RenderId;
  connectionId: YouTubeConnectionId;
  metadataDraftId: PublishingMetadataDraftId;
  workflowId: WorkflowId;
  intentKey: string;
  idempotencyKey: string;
  metadataSnapshot: PublishingMetadataEntityDto;
  visibility: PublicationVisibility;
  apiProjectVerifiedSnapshot: boolean;
  schedule: PublishingScheduleEntityDto | null;
  state: PublicationState;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  remoteVideoCreatedAt: Date | null;
  thumbnailWarningCode: string | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

## RED-GREEN-REFACTOR cycle 1: metadata limits and policy

- [ ] **RED 1.1 — Write table-driven metadata tests first.**

Create `publishing-metadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  parsePublishingMetadata,
  youtubeKeywordTagLength,
} from './publishing-metadata';

const valid = {
  title: 'One useful idea',
  description: 'A concise description',
  hashtags: ['#ClipFactory', '#VideoTips'],
  keywordTags: ['clip factory', 'video tips'],
  categoryId: '22',
  defaultLanguage: 'en',
  madeForKids: false,
  containsSyntheticMedia: false,
} as const;

describe('publishing metadata', () => {
  it('accepts reviewed metadata at the documented limits', () => {
    const metadata = parsePublishingMetadata({
      ...valid,
      title: '😀'.repeat(100),
      description: 'é'.repeat(2500),
    });
    expect(Array.from(metadata.title)).toHaveLength(100);
    expect(new TextEncoder().encode(metadata.description)).toHaveLength(5000);
  });

  it.each([
    ['empty title', { ...valid, title: '' }, 'title is required'],
    ['long title', { ...valid, title: 'a'.repeat(101) }, 'title exceeds 100 characters'],
    ['angle bracket title', { ...valid, title: 'A <title>' }, 'title contains < or >'],
    [
      'long UTF-8 description',
      { ...valid, description: 'é'.repeat(2501) },
      'description exceeds 5000 UTF-8 bytes',
    ],
    [
      'spaced hashtag',
      { ...valid, hashtags: ['#two words'] },
      'hashtags cannot contain spaces',
    ],
    [
      'sixty hashtags',
      { ...valid, hashtags: Array.from({ length: 60 }, (_, index) => `#h${index}`) },
      '60 or more hashtags are not allowed',
    ],
    [
      'invalid category',
      { ...valid, categoryId: 'people' },
      'categoryId must be numeric',
    ],
  ])('rejects %s', (_name, input, expectedMessage) => {
    expect(() => parsePublishingMetadata(input)).toThrow(expectedMessage);
  });

  it('uses YouTube quoted-space accounting for keyword tags', () => {
    expect(youtubeKeywordTagLength(['clip', 'video tips'])).toBe(17);
    expect(() =>
      parsePublishingMetadata({ ...valid, keywordTags: ['two words'.repeat(46)] }),
    ).toThrow('keyword tags exceed 500 characters');
  });
});
```

- [ ] **RED 1.2 — Witness the missing policy.**

Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/domain/publishing-metadata.test.ts
```

Expected RED: the policy signature shell collects; `parsePublishingMetadata` does not yet reject the 101-code-point title with `title exceeds 100 Unicode code points`. An unresolved import is not accepted.

- [ ] **GREEN 1.3 — Implement the minimum authoritative policy.**

Create `publishing-metadata.ts`:

```ts
import type { PublishingMetadataEntityDto } from '../application/dto/entity/youtube-publishing-entity.dto';

const utf8 = new TextEncoder();

export class InvalidPublishingMetadataError extends Error {
  readonly code = 'INVALID_PUBLISHING_METADATA';
}

export function youtubeKeywordTagLength(tags: readonly string[]): number {
  return tags.reduce((total, tag, index) => {
    const quotedLength = tag.includes(' ') ? tag.length + 2 : tag.length;
    return total + quotedLength + (index === 0 ? 0 : 1);
  }, 0);
}

export function parsePublishingMetadata(
  input: PublishingMetadataEntityDto,
): PublishingMetadataEntityDto {
  const titleLength = Array.from(input.title).length;
  if (titleLength === 0) throw invalid('title is required');
  if (titleLength > 100) throw invalid('title exceeds 100 characters');
  if (/[<>]/u.test(input.title)) throw invalid('title contains < or >');
  if (utf8.encode(input.description).length > 5000) {
    throw invalid('description exceeds 5000 UTF-8 bytes');
  }
  if (/[<>]/u.test(input.description)) throw invalid('description contains < or >');
  if (input.hashtags.length >= 60) throw invalid('60 or more hashtags are not allowed');
  if (new Set(input.hashtags).size !== input.hashtags.length) {
    throw invalid('hashtags must be unique');
  }
  if (input.hashtags.some((tag) => !/^#[^\s#]+$/u.test(tag))) {
    throw invalid('hashtags cannot contain spaces');
  }
  if (youtubeKeywordTagLength(input.keywordTags) > 500) {
    throw invalid('keyword tags exceed 500 characters');
  }
  if (!/^[0-9]+$/u.test(input.categoryId)) throw invalid('categoryId must be numeric');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(input.defaultLanguage)) {
    throw invalid('defaultLanguage must be a BCP-47 language tag');
  }
  return Object.freeze({
    ...input,
    hashtags: Object.freeze([...input.hashtags]),
    keywordTags: Object.freeze([...input.keywordTags]),
  });
}

function invalid(message: string): InvalidPublishingMetadataError {
  return new InvalidPublishingMetadataError(message);
}
```

Run the focused test. Expected GREEN: all cases PASS.

- [ ] **REFACTOR 1.4 — Add generator-specific stricter output without weakening reviewed input.**

Append this failing test first:

```ts
it('limits generated metadata to eight hashtags without narrowing manual review', () => {
  const nine = Array.from({ length: 9 }, (_, index) => `#relevant${index}`);
  expect(() => parseGeneratedPublishingMetadata({ ...valid, hashtags: nine })).toThrow(
    'generated metadata exceeds eight hashtags',
  );
  expect(() => parsePublishingMetadata({ ...valid, hashtags: nine })).not.toThrow();
});
```

Run the focused test and expect RED because `parseGeneratedPublishingMetadata` is missing. Then append:

```ts
export function parseGeneratedPublishingMetadata(
  input: PublishingMetadataEntityDto,
): PublishingMetadataEntityDto {
  const metadata = parsePublishingMetadata(input);
  if (metadata.hashtags.length > 8) {
    throw invalid('generated metadata exceeds eight hashtags');
  }
  return metadata;
}
```

Rerun the file; expected GREEN is PASS. Manual reviewed metadata remains allowed up to 59 hashtags.

## RED-GREEN-REFACTOR cycle 2: schedule conversion and private-first policy

- [ ] **RED 2.1 — Write DST, past-time, collision, and verification tests.**

Create `publishing-schedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  decidePublicationVisibility,
  detectScheduleCollision,
  normalizePublishingSchedule,
} from './publishing-schedule';

describe('publishing schedule', () => {
  const now = new Date('2026-07-11T00:00:00.000Z');

  it('stores the source IANA timezone and normalized UTC instant', () => {
    expect(
      normalizePublishingSchedule('2026-07-12T09:30:00', 'Asia/Tokyo', now),
    ).toEqual({
      sourceLocalDateTime: '2026-07-12T09:30:00',
      sourceTimezone: 'Asia/Tokyo',
      publishAtUtc: '2026-07-12T00:30:00Z',
    });
  });

  it.each([
    ['2026-03-08T02:30:00', 'America/New_York', 'nonexistent or ambiguous local time'],
    ['2026-11-01T01:30:00', 'America/New_York', 'nonexistent or ambiguous local time'],
    ['2026-07-10T09:30:00', 'Asia/Tokyo', 'schedule must be in the future'],
  ])('rejects invalid wall time %s in %s', (local, zone, message) => {
    expect(() => normalizePublishingSchedule(local, zone, now)).toThrow(message);
  });

  it('requires confirmation for an existing instant within five minutes', () => {
    expect(
      detectScheduleCollision(
        '2026-07-12T00:33:00Z',
        ['2026-07-12T00:30:00Z'],
        false,
      ),
    ).toEqual({ requiresConfirmation: true });
    expect(
      detectScheduleCollision(
        '2026-07-12T00:33:00Z',
        ['2026-07-12T00:30:00Z'],
        true,
      ),
    ).toEqual({ requiresConfirmation: false });
  });

  it('locks scheduling when the API project is unverified', () => {
    expect(() =>
      decidePublicationVisibility({
        requested: 'SCHEDULED',
        apiProjectVerified: false,
        schedule: {
          sourceLocalDateTime: '2026-07-12T09:30:00',
          sourceTimezone: 'Asia/Tokyo',
          publishAtUtc: '2026-07-12T00:30:00Z',
        },
      }),
    ).toThrow('unverified API projects support private review only');
  });
});
```

- [ ] **RED 2.2 — Witness missing schedule policy.**

Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/domain/publishing-schedule.test.ts
```

Expected RED: the schedule signature shell collects; the nonexistent New York wall time `2026-03-08T02:30:00` is accepted instead of throwing `nonexistent local time`. An unresolved import is not accepted.

- [ ] **GREEN 2.3 — Implement with Temporal reject disambiguation.**

Add `@js-temporal/polyfill@0.5.1` to `apps/web` and create `publishing-schedule.ts`:

```ts
import { Temporal } from '@js-temporal/polyfill';

import {
  PublicationVisibility,
  type PublishingScheduleEntityDto,
} from '../application/dto/entity/youtube-publishing-entity.dto';

export function normalizePublishingSchedule(
  sourceLocalDateTime: string,
  sourceTimezone: string,
  now: Date,
): PublishingScheduleEntityDto {
  let zoned: Temporal.ZonedDateTime;
  try {
    const local = Temporal.PlainDateTime.from(sourceLocalDateTime);
    zoned = local.toZonedDateTime(sourceTimezone, { disambiguation: 'reject' });
  } catch {
    throw new Error('nonexistent or ambiguous local time');
  }
  const publishAtUtc = zoned.toInstant();
  if (Temporal.Instant.compare(publishAtUtc, Temporal.Instant.from(now.toISOString())) <= 0) {
    throw new Error('schedule must be in the future');
  }
  return {
    sourceLocalDateTime,
    sourceTimezone,
    publishAtUtc: publishAtUtc.toString(),
  };
}

export function detectScheduleCollision(
  publishAtUtc: string,
  existingInstants: readonly string[],
  collisionConfirmed: boolean,
): { requiresConfirmation: boolean } {
  const candidate = Temporal.Instant.from(publishAtUtc).epochMilliseconds;
  const collides = existingInstants.some(
    (value) => Math.abs(Temporal.Instant.from(value).epochMilliseconds - candidate) <= 300_000,
  );
  return { requiresConfirmation: collides && !collisionConfirmed };
}

export function decidePublicationVisibility(input: {
  requested: 'PRIVATE_REVIEW' | 'SCHEDULED';
  apiProjectVerified: boolean;
  schedule: PublishingScheduleEntityDto | null;
}): PublicationVisibility {
  if (input.requested === 'SCHEDULED') {
    if (!input.apiProjectVerified) {
      throw new Error('unverified API projects support private review only');
    }
    if (!input.schedule) throw new Error('scheduled publication requires a schedule');
    return PublicationVisibility.Scheduled;
  }
  if (input.schedule) throw new Error('private review cannot include publishAt');
  return PublicationVisibility.PrivateReview;
}
```

Run the focused test. Expected GREEN: all cases PASS.

- [ ] **REFACTOR 2.4 — Keep provider request shape out of policy.**

Return Entity enums/value objects only; do not return Google's `privacyStatus` or `publishAt` DTO. Make exhaustiveness executable in the existing policy file:

```ts
function assertNever(value: never): never {
  throw new Error(`unhandled publication visibility ${String(value)}`);
}

export function visibilityRequiresSchedule(value: PublicationVisibility): boolean {
  switch (value) {
    case PublicationVisibility.PrivateReview:
      return false;
    case PublicationVisibility.Scheduled:
      return true;
    default:
      return assertNever(value);
  }
}
```

Rerun:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/policies/publishing-metadata-policy.test.ts
pnpm test:architecture
```

## RED-GREEN-REFACTOR cycle 3: eligibility and state transitions

- [ ] **RED 3.1 — Write eligibility and transition tests.**

Create `upload-eligibility.test.ts`:

```ts
import { expect, it } from 'vitest';

import { assertYouTubeShortsEligible } from './upload-eligibility';

it('requires a successful 9:16 render no longer than 180 seconds', () => {
  expect(() =>
    assertYouTubeShortsEligible({ status: 'COMPLETED', width: 1080, height: 1920, durationMs: 180_000 }),
  ).not.toThrow();
  expect(() =>
    assertYouTubeShortsEligible({ status: 'FAILED', width: 1080, height: 1920, durationMs: 60_000 }),
  ).toThrow('render is not completed');
  expect(() =>
    assertYouTubeShortsEligible({ status: 'COMPLETED', width: 1920, height: 1080, durationMs: 60_000 }),
  ).toThrow('render must be 9:16');
  expect(() =>
    assertYouTubeShortsEligible({ status: 'COMPLETED', width: 1080, height: 1920, durationMs: 180_001 }),
  ).toThrow('render exceeds 180 seconds');
});
```

Create `publication-state.test.ts`:

```ts
import { expect, it } from 'vitest';

import { PublicationState } from '../application/dto/entity/youtube-publishing-entity.dto';
import { assertPublicationTransition } from './publication-state';

it('allows only explicit publication transitions', () => {
  expect(() =>
    assertPublicationTransition(PublicationState.ReadyToUpload, PublicationState.Uploading),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(PublicationState.Uploading, PublicationState.YouTubeProcessing),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(
      PublicationState.Uploading,
      PublicationState.UploadOutcomeUncertain,
    ),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(
      PublicationState.UploadOutcomeUncertain,
      PublicationState.ReadyToUpload,
    ),
  ).toThrow('invalid publication transition UPLOAD_OUTCOME_UNCERTAIN -> READY_TO_UPLOAD');
  expect(() =>
    assertPublicationTransition(
      PublicationState.UploadOutcomeUncertain,
      PublicationState.Uploading,
    ),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(PublicationState.YouTubeProcessing, PublicationState.Scheduled),
  ).not.toThrow();
  expect(() =>
    assertPublicationTransition(PublicationState.Cancelled, PublicationState.Uploading),
  ).toThrow('invalid publication transition CANCELLED -> UPLOADING');
  expect(() =>
    assertPublicationTransition(PublicationState.Published, PublicationState.ReadyToUpload),
  ).toThrow('invalid publication transition PUBLISHED -> READY_TO_UPLOAD');
});
```

- [ ] **RED 3.2 — Run both tests and witness missing functions.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/domain/upload-eligibility.test.ts src/modules/youtube-publishing/domain/publication-state.test.ts
```

Expected RED: the eligibility/transition shells collect; `assertPublicationTransition(Uploading, ReadyToUpload)` returns instead of throwing `invalid publication transition UPLOADING -> READY_TO_UPLOAD`.

- [ ] **GREEN 3.3 — Implement the exact pure rules.**

`upload-eligibility.ts`:

```ts
export function assertYouTubeShortsEligible(render: {
  status: string;
  width: number;
  height: number;
  durationMs: number;
}): void {
  if (render.status !== 'COMPLETED') throw new Error('render is not completed');
  if (render.width * 16 !== render.height * 9) throw new Error('render must be 9:16');
  if (render.durationMs > 180_000) throw new Error('render exceeds 180 seconds');
}
```

`publication-state.ts`:

```ts
import { PublicationState } from '../application/dto/entity/youtube-publishing-entity.dto';

const allowed: Readonly<Record<PublicationState, ReadonlySet<PublicationState>>> = {
  [PublicationState.ReadyToUpload]: new Set([
    PublicationState.Uploading,
    PublicationState.Cancelled,
  ]),
  [PublicationState.Uploading]: new Set([
    PublicationState.UploadOutcomeUncertain,
    PublicationState.YouTubeProcessing,
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.UploadOutcomeUncertain]: new Set([
    PublicationState.Uploading,
    PublicationState.YouTubeProcessing,
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.YouTubeProcessing]: new Set([
    PublicationState.PrivateReview,
    PublicationState.Scheduled,
    PublicationState.Published,
    PublicationState.Failed,
    PublicationState.Cancelled,
  ]),
  [PublicationState.PrivateReview]: new Set([
    PublicationState.Published,
    PublicationState.Failed,
  ]),
  [PublicationState.Scheduled]: new Set([
    PublicationState.Published,
    PublicationState.Failed,
  ]),
  [PublicationState.Published]: new Set(),
  [PublicationState.Failed]: new Set([
    PublicationState.ReadyToUpload,
    PublicationState.Cancelled,
  ]),
  [PublicationState.Cancelled]: new Set(),
};

export function assertPublicationTransition(
  current: PublicationState,
  next: PublicationState,
): void {
  if (!allowed[current].has(next)) {
    throw new Error(`invalid publication transition ${current} -> ${next}`);
  }
}
```

Run both focused tests. Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Prove every enum member is covered.**

Append this test:

```ts
it('defines a transition set for every publication state', () => {
  const transitions = publicationTransitions();
  expect(Object.keys(transitions).sort()).toEqual(
    Object.values(PublicationState).sort(),
  );
  expect(Object.isFrozen(transitions)).toBe(true);
  expect(Object.isFrozen(transitions[PublicationState.Uploading])).toBe(true);
});
```

Witness RED because `publicationTransitions` is absent, then export a function that returns a deeply frozen copy whose values are readonly arrays rather than mutable sets:

```ts
export function publicationTransitions(): Readonly<Record<PublicationState, readonly PublicationState[]>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(allowed).map(([state, targets]) => [state, Object.freeze([...targets])]),
    ) as Record<PublicationState, readonly PublicationState[]>,
  );
}
```

Rerun all Task 2 tests; expected GREEN is PASS.

## Broader verification

- [ ] Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/domain
pnpm --filter @clip-factory/web exec vitest run --coverage src/modules/youtube-publishing/domain
pnpm typecheck
pnpm test:architecture
pnpm format:check
git diff --check
```

- [ ] Require 100% branch coverage for these pure policy files; they are finite invariant tables, not infrastructure.
- [ ] Confirm no provider/framework import appears under `domain/` or the Entity DTO file.

## Review gate

Approve only when all limits, UTF-8/code-point distinctions, DST ambiguity/gaps, verification lockout, Shorts eligibility, and every state transition are executable pure tests consumed from one domain implementation.

## Suggested commit

```text
feat(youtube): define publishing domain policy
```
