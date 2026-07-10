# Task 1: Versioned Publishing Contracts and Executable Boundary Rules

> **Implementation mode:** Complete only after the hard Phase 1 gate in [master.md](./master.md). Use witnessed RED-GREEN-REFACTOR for each behavior below and stop for review before Task 2.

## Purpose

Establish the token-free cross-runtime payloads and executable dependency rules that every later Phase 2 task must consume. This task adds no OAuth, database, provider, workflow, or UI behavior.

## Requirements and traceability

- YouTube design §§8–9, 11, 16, 19: workflows carry opaque IDs/sanitized data, never credentials or SDK objects; every boundary model is distinct.
- YouTube acceptance criterion 12: CI proves SDK/token/persistence/HTTP DTO types do not leak inward.
- Core design §§22, 30.1–30.7: versioned schemas, generated TS/Python types, inward dependencies, tested converters, cycle/leak enforcement.
- Decision log decisions 47, 48, 50, 51, and 61.

## Clean Architecture ownership

- **Affected layers:** shared contract boundary, TypeScript/Python architecture enforcement only.
- **Owned DTO boundary:** Temporal payload DTOs under the shared JSON schema; these are not Entity, API, Record, Google/OpenAI Client, or UI DTOs.
- **Owned enforcement:** root dependency-cruiser/TypeScript leak scanner and worker import-linter configuration.
- **Forbidden:** adding provider tokens, authorization codes, PKCE values, raw transcript/media, Prisma models, Google/OpenAI SDK classes, or business policy to the shared contract.

## Files

- Create: `packages/contracts/schema/youtube-publishing.schema.json`
- Modify: `packages/contracts/schema/schema-bodies.mjs`
- Create: `packages/contracts/src/youtube-publishing.ts`
- Create: `packages/contracts/src/youtube-publishing-contract.test.ts`
- Create (generated): `packages/contracts/src/generated/youtube-publishing.ts`
- Create (generated): `apps/worker/src/clip_factory/entrypoints/contracts/generated/youtube_publishing.py`
- Create: `apps/worker/tests/entrypoints/contracts/test_youtube_publishing_contract.py`
- Create: `tests/architecture/fixtures/ts/youtube-sdk-leak.ts`
- Create: `scripts/check-youtube-boundaries.test.mjs`
- Modify: `apps/web/src/shared/domain/identifiers.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/validate.ts`
- Modify: `packages/contracts/package.json`
- Modify: `.dependency-cruiser.cjs`
- Modify: `scripts/check-ts-boundaries.mjs`
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/worker/.importlinter`
- Modify: `package.json`

Do not hand-edit generated files. Change the schema/generator inputs and run the Phase 1 generator.

## Prerequisites

- Phase 1 contract generation and `pnpm test:contracts` are green.
- Phase 1 architecture tests and `pnpm test:architecture` are green.
- The existing package export and schema-generation conventions have been inspected and retained.

## Interfaces

**Consumes:** Phase 1 `ProjectId`, common-contract `ObjectReference`, generated-contract tooling, and internal service authentication. Phase 1 persists clip/render/workflow/usage IDs as strings but does not define their shared branded TypeScript values, so this task adds those missing brands without changing persistence.

**Produces:**

```ts
export type YouTubeConnectionId = string & { readonly __brand: 'YouTubeConnectionId' };
export type PublishingMetadataDraftId = string & {
  readonly __brand: 'PublishingMetadataDraftId';
};
export type PublicationId = string & { readonly __brand: 'PublicationId' };
export type PublicationAttemptId = string & {
  readonly __brand: 'PublicationAttemptId';
};
export type ClipId = string & { readonly __brand: 'ClipId' };
export type RenderId = string & { readonly __brand: 'RenderId' };
export type AIUsageEventId = string & { readonly __brand: 'AIUsageEventId' };
export type WorkflowId = string & { readonly __brand: 'WorkflowId' };
export type PaidCallReservationId = string & { readonly __brand: 'PaidCallReservationId' };

export type OAuthConnectionWorkflowInputV1 = {
  contractVersion: 1;
  connectionId: YouTubeConnectionId;
  requestedScopes: readonly [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];
};

export type OAuthConnectionWorkflowResultV1 = {
  contractVersion: 1;
  connectionId: YouTubeConnectionId;
  status: 'CONNECTED' | 'DISCONNECTED' | 'REAUTH_REQUIRED';
  safeReasonCode:
    | 'CONSENT_DENIED'
    | 'STATE_MISMATCH'
    | 'STATE_EXPIRED'
    | 'MISSING_SCOPE'
    | 'CALLBACK_TIMEOUT'
    | 'GOOGLE_POLICY_DENIED'
    | 'INVALID_GRANT'
    | null;
};

export type YouTubeConnectionEventV1 =
  | {
      contractVersion: 1;
      type: 'CONNECTED';
      connectionId: YouTubeConnectionId;
      channelId: string;
      channelTitle: string;
      channelHandle: string | null;
      avatarUrl: string | null;
      grantedScopes: readonly string[];
      oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
      refreshTokenExpiresAt: string | null;
    }
  | {
      contractVersion: 1;
      type: 'REAUTH_REQUIRED';
      connectionId: YouTubeConnectionId;
      reasonCode: 'INVALID_GRANT';
    }
  | {
      contractVersion: 1;
      type: 'DISCONNECTED';
      connectionId: YouTubeConnectionId;
      revocationUncertain: boolean;
    }
  | {
      contractVersion: 1;
      type: 'FAILED';
      connectionId: YouTubeConnectionId;
      reasonCode:
        | 'CONSENT_DENIED'
        | 'STATE_MISMATCH'
        | 'STATE_EXPIRED'
        | 'MISSING_SCOPE'
        | 'CALLBACK_TIMEOUT'
        | 'GOOGLE_POLICY_DENIED';
    };

export type MetadataGenerationWorkflowInputV1 = {
  contractVersion: 1;
  projectId: ProjectId;
  clipId: ClipId;
  draftId: PublishingMetadataDraftId;
  callId: PaidCallReservationId;
  requestHash: string;
  transcriptObject: ObjectReference;
  modelId: 'gpt-5.6-sol' | 'gpt-5.5';
  reasoningLevel: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  modelCatalogVersion: string;
  pricingVersion: string;
  maxGeneratedTokens: number;
  promptCachePolicy: 'EXPLICIT_DISABLED' | 'LEGACY_AUTOMATIC_NO_WRITE_FEE';
  maxCostMicrousd: string;
  instruction: string | null;
};

export type PublicationWorkflowInputV1 = {
  contractVersion: 1;
  publicationId: PublicationId;
  attemptId: PublicationAttemptId;
  connectionId: YouTubeConnectionId;
  clipId: ClipId;
  renderId: RenderId;
  renderObject: ObjectReference;
  coverObject: ObjectReference | null;
  totalBytes: number;
  metadataSnapshot: PublishingMetadataSnapshotV1;
  visibility: 'PRIVATE_REVIEW' | 'SCHEDULED';
  scheduleAtUtc: string | null;
  sourceTimezone: string | null;
  apiProjectVerified: boolean;
};

export type PublicationProgressEventV1 =
  | {
      contractVersion: 1;
      type: 'UPLOAD_PROGRESS';
      publicationId: PublicationId;
      attemptId: PublicationAttemptId;
      acknowledgedBytes: string;
      progressPercent: number;
    }
  | {
      contractVersion: 1;
      type: 'UPLOAD_OUTCOME_UNCERTAIN';
      publicationId: PublicationId;
      attemptId: PublicationAttemptId;
      finalChunkDispatchedAt: string;
      safeReasonCode: 'FINAL_UPLOAD_RESULT_UNKNOWN' | 'SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH';
      requiredAction: 'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK';
    }
  | {
      contractVersion: 1;
      type: 'VIDEO_CREATED';
      publicationId: PublicationId;
      attemptId: PublicationAttemptId;
      videoId: string;
      videoUrl: string;
      createdAt: string;
    };
```

Later tasks may depend only on generated forms of these payloads. Application Entity DTOs must be declared separately inside `youtube-publishing`.

## RED-GREEN-REFACTOR cycle 1: token-free schema and generated parity

- [ ] **RED 1.1 — Write the TypeScript contract test first.**

Create `packages/contracts/src/youtube-publishing-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  parseOAuthConnectionWorkflowInputV1,
  parsePublicationProgressEventV1,
  parsePublicationWorkflowInputV1,
} from './youtube-publishing';

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
] as const;

describe('YouTube publishing Temporal contract', () => {
  it('accepts the exact two scopes and opaque connection id', () => {
    expect(
      parseOAuthConnectionWorkflowInputV1({
        contractVersion: 1,
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        requestedScopes: scopes,
      }),
    ).toMatchObject({ contractVersion: 1, requestedScopes: scopes });
  });

  it.each([
    'accessToken',
    'refreshToken',
    'authorizationCode',
    'codeVerifier',
    'clientSecret',
  ])('rejects credential property %s', (credentialProperty) => {
    expect(() =>
      parseOAuthConnectionWorkflowInputV1({
        contractVersion: 1,
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        requestedScopes: scopes,
        [credentialProperty]: 'sentinel-secret',
      }),
    ).toThrow();
  });

  it('rejects scheduled publication when timezone or UTC instant is absent', () => {
    expect(() =>
      parsePublicationWorkflowInputV1({
        contractVersion: 1,
        publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb43',
        attemptId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb44',
        connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
        clipId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb45',
        renderId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb46',
        renderObject: {
          bucket: 'clip-factory',
          key: 'renders/clip-1/final.mp4',
          versionId: 'render-version-1',
          sha256: 'a'.repeat(64),
        },
        coverObject: null,
        totalBytes: 1048576,
        metadataSnapshot: {
          title: 'A concise title',
          description: 'A reviewed description',
          hashtags: ['#ClipFactory'],
          keywordTags: ['clip factory'],
          categoryId: '22',
          defaultLanguage: 'en',
          madeForKids: false,
          containsSyntheticMedia: false,
        },
        visibility: 'SCHEDULED',
        scheduleAtUtc: null,
        sourceTimezone: null,
        apiProjectVerified: true,
      }),
    ).toThrow('scheduled publication requires scheduleAtUtc and sourceTimezone');
  });

  it('accepts only the canonical upload uncertainty action', () => {
    expect(() =>
      parsePublicationProgressEventV1({
        contractVersion: 1,
        type: 'UPLOAD_OUTCOME_UNCERTAIN',
        publicationId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb43',
        attemptId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb44',
        finalChunkDispatchedAt: '2026-07-11T01:00:00Z',
        safeReasonCode: 'FINAL_UPLOAD_RESULT_UNKNOWN',
        requiredAction: 'CREATE_REPLACEMENT_NOW',
      }),
    ).toThrow();
  });
});
```

- [ ] **RED 1.2 — Witness the missing generated contract.**

Run:

```bash
pnpm --filter @clip-factory/contracts exec vitest run src/youtube-publishing-contract.test.ts
```

Expected RED: the generated signature shell collects; the first valid OAuth input throws `NOT_IMPLEMENTED:youtube-publishing-contract` instead of returning the parsed DTO. Missing-module, syntax, or configuration failure is not an accepted RED.

- [ ] **RED 1.3 — Write the Python parity test before generation.**

Create `apps/worker/tests/entrypoints/contracts/test_youtube_publishing_contract.py`:

```python
from pydantic import ValidationError
import pytest

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
)


SCOPES = (
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
)


def test_oauth_contract_forbids_token_material() -> None:
    with pytest.raises(ValidationError):
        OAuthConnectionWorkflowInputV1.model_validate(
            {
                'contractVersion': 1,
                'connectionId': '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
                'requestedScopes': SCOPES,
                'refreshToken': 'sentinel-secret',
            }
        )


def test_oauth_contract_accepts_only_required_scopes() -> None:
    payload = OAuthConnectionWorkflowInputV1.model_validate(
        {
            'contractVersion': 1,
            'connectionId': '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
            'requestedScopes': SCOPES,
        }
    )
    assert tuple(payload.requested_scopes) == SCOPES
```

Run:

```bash
uv run --directory apps/worker pytest tests/entrypoints/contracts/test_youtube_publishing_contract.py -q
```

Expected RED: collection FAIL with `ModuleNotFoundError` for generated `youtube_publishing`.

- [ ] **GREEN 1.4 — Add the minimum complete schema and generation exports.**

Add the following object as `youtubePublishingSchema` in `packages/contracts/schema/schema-bodies.mjs`; include it in that file's exported schema map so the existing generator writes `packages/contracts/schema/youtube-publishing.schema.json`. Every object uses `additionalProperties: false`. The generated JSON definitions are exactly:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://clip-factory.local/contracts/youtube-publishing.schema.json",
  "title": "Clip Factory YouTube Publishing Contracts",
  "$defs": {
    "uuid": {
      "type": "string",
      "format": "uuid"
    },
    "objectKey": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "pattern": "^[^\\u0000]+$"
    },
    "moneyMicrousd": {
      "type": "string",
      "pattern": "^(0|[1-9][0-9]*)$"
    },
    "nonnegativeIntegerString": {
      "type": "string",
      "pattern": "^(0|[1-9][0-9]*)$"
    },
    "requiredScopes": {
      "type": "array",
      "prefixItems": [
        {
          "const": "https://www.googleapis.com/auth/youtube.upload"
        },
        {
          "const": "https://www.googleapis.com/auth/youtube.readonly"
        }
      ],
      "items": false,
      "minItems": 2,
      "maxItems": 2
    },
    "metadataSnapshotV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "title",
        "description",
        "hashtags",
        "keywordTags",
        "categoryId",
        "defaultLanguage",
        "madeForKids",
        "containsSyntheticMedia"
      ],
      "properties": {
        "title": { "type": "string", "minLength": 1, "maxLength": 100 },
        "description": { "type": "string" },
        "hashtags": {
          "type": "array",
          "items": { "type": "string", "pattern": "^#[^\\s#]+$" },
          "maxItems": 59,
          "uniqueItems": true
        },
        "keywordTags": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        },
        "categoryId": { "type": "string", "pattern": "^[0-9]+$" },
        "defaultLanguage": { "type": "string", "minLength": 2, "maxLength": 35 },
        "madeForKids": { "type": "boolean" },
        "containsSyntheticMedia": { "type": "boolean" }
      }
    },
    "oauthConnectionWorkflowInputV1": {
      "type": "object",
      "additionalProperties": false,
      "required": ["contractVersion", "connectionId", "requestedScopes"],
      "properties": {
        "contractVersion": { "const": 1 },
        "connectionId": { "$ref": "#/$defs/uuid" },
        "requestedScopes": { "$ref": "#/$defs/requiredScopes" }
      }
    },
    "oauthConnectionWorkflowResultV1": {
      "type": "object",
      "additionalProperties": false,
      "required": ["contractVersion", "connectionId", "status", "safeReasonCode"],
      "properties": {
        "contractVersion": { "const": 1 },
        "connectionId": { "$ref": "#/$defs/uuid" },
        "status": { "enum": ["CONNECTED", "DISCONNECTED", "REAUTH_REQUIRED"] },
        "safeReasonCode": {
          "type": ["string", "null"],
          "enum": [
            "CONSENT_DENIED", "STATE_MISMATCH", "STATE_EXPIRED", "MISSING_SCOPE",
            "CALLBACK_TIMEOUT", "GOOGLE_POLICY_DENIED", "INVALID_GRANT", null
          ]
        }
      }
    },
    "youTubeConnectionEventV1": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "contractVersion", "type", "connectionId", "channelId", "channelTitle",
            "channelHandle", "avatarUrl", "grantedScopes", "oauthMode",
            "refreshTokenExpiresAt"
          ],
          "properties": {
            "contractVersion": { "const": 1 },
            "type": { "const": "CONNECTED" },
            "connectionId": { "$ref": "#/$defs/uuid" },
            "channelId": { "type": "string", "minLength": 1 },
            "channelTitle": { "type": "string", "minLength": 1 },
            "channelHandle": { "type": ["string", "null"] },
            "avatarUrl": { "type": ["string", "null"], "format": "uri" },
            "grantedScopes": { "$ref": "#/$defs/requiredScopes" },
            "oauthMode": { "enum": ["TESTING", "PRODUCTION", "UNKNOWN"] },
            "refreshTokenExpiresAt": { "type": ["string", "null"], "format": "date-time" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["contractVersion", "type", "connectionId", "reasonCode"],
          "properties": {
            "contractVersion": { "const": 1 },
            "type": { "const": "REAUTH_REQUIRED" },
            "connectionId": { "$ref": "#/$defs/uuid" },
            "reasonCode": { "const": "INVALID_GRANT" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["contractVersion", "type", "connectionId", "revocationUncertain"],
          "properties": {
            "contractVersion": { "const": 1 },
            "type": { "const": "DISCONNECTED" },
            "connectionId": { "$ref": "#/$defs/uuid" },
            "revocationUncertain": { "type": "boolean" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["contractVersion", "type", "connectionId", "reasonCode"],
          "properties": {
            "contractVersion": { "const": 1 },
            "type": { "const": "FAILED" },
            "connectionId": { "$ref": "#/$defs/uuid" },
            "reasonCode": {
              "enum": [
                "CONSENT_DENIED", "STATE_MISMATCH", "STATE_EXPIRED", "MISSING_SCOPE",
                "CALLBACK_TIMEOUT", "GOOGLE_POLICY_DENIED"
              ]
            }
          }
        }
      ]
    },
    "metadataGenerationWorkflowInputV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractVersion",
        "projectId",
        "clipId",
        "draftId",
        "callId",
        "requestHash",
        "transcriptObject",
        "modelId",
        "reasoningLevel",
        "modelCatalogVersion",
        "pricingVersion",
        "maxGeneratedTokens",
        "promptCachePolicy",
        "maxCostMicrousd",
        "instruction"
      ],
      "properties": {
        "contractVersion": { "const": 1 },
        "projectId": { "$ref": "#/$defs/uuid" },
        "clipId": { "$ref": "#/$defs/uuid" },
        "draftId": { "$ref": "#/$defs/uuid" },
        "callId": { "$ref": "#/$defs/uuid" },
        "requestHash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "transcriptObject": {
          "$ref": "https://clip-factory.local/contracts/common/1.0.0#/$defs/objectReference"
        },
        "modelId": { "enum": ["gpt-5.6-sol", "gpt-5.5"] },
        "reasoningLevel": { "enum": ["none", "low", "medium", "high", "xhigh", "max"] },
        "modelCatalogVersion": { "type": "string", "minLength": 1 },
        "pricingVersion": { "type": "string", "minLength": 1 },
        "maxGeneratedTokens": { "type": "integer", "minimum": 1 },
        "promptCachePolicy": {
          "enum": ["EXPLICIT_DISABLED", "LEGACY_AUTOMATIC_NO_WRITE_FEE"]
        },
        "maxCostMicrousd": { "$ref": "#/$defs/moneyMicrousd" },
        "instruction": { "type": ["string", "null"], "maxLength": 2000 }
      }
    },
    "publicationWorkflowInputV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractVersion",
        "publicationId",
        "attemptId",
        "connectionId",
        "clipId",
        "renderId",
        "renderObject",
        "coverObject",
        "totalBytes",
        "metadataSnapshot",
        "visibility",
        "scheduleAtUtc",
        "sourceTimezone",
        "apiProjectVerified"
      ],
      "properties": {
        "contractVersion": { "const": 1 },
        "publicationId": { "$ref": "#/$defs/uuid" },
        "attemptId": { "$ref": "#/$defs/uuid" },
        "connectionId": { "$ref": "#/$defs/uuid" },
        "clipId": { "$ref": "#/$defs/uuid" },
        "renderId": { "$ref": "#/$defs/uuid" },
        "renderObject": {
          "$ref": "https://clip-factory.local/contracts/common/1.0.0#/$defs/objectReference"
        },
        "coverObject": {
          "oneOf": [
            {
              "$ref": "https://clip-factory.local/contracts/common/1.0.0#/$defs/objectReference"
            },
            { "type": "null" }
          ]
        },
        "totalBytes": { "type": "integer", "minimum": 1 },
        "metadataSnapshot": { "$ref": "#/$defs/metadataSnapshotV1" },
        "visibility": { "enum": ["PRIVATE_REVIEW", "SCHEDULED"] },
        "scheduleAtUtc": { "type": ["string", "null"], "format": "date-time" },
        "sourceTimezone": { "type": ["string", "null"], "minLength": 1 },
        "apiProjectVerified": { "type": "boolean" }
      },
      "allOf": [
        {
          "if": {
            "properties": { "visibility": { "const": "SCHEDULED" } },
            "required": ["visibility"]
          },
          "then": {
            "properties": {
              "scheduleAtUtc": { "type": "string", "format": "date-time" },
              "sourceTimezone": { "type": "string", "minLength": 1 },
              "apiProjectVerified": { "const": true }
            }
          },
          "else": {
            "properties": {
              "scheduleAtUtc": { "type": "null" },
              "sourceTimezone": { "type": "null" }
            }
          }
        }
      ]
    },
    "publicationUploadProgressEventV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractVersion",
        "type",
        "publicationId",
        "attemptId",
        "acknowledgedBytes",
        "progressPercent"
      ],
      "properties": {
        "contractVersion": { "const": 1 },
        "type": { "const": "UPLOAD_PROGRESS" },
        "publicationId": { "$ref": "#/$defs/uuid" },
        "attemptId": { "$ref": "#/$defs/uuid" },
        "acknowledgedBytes": { "$ref": "#/$defs/nonnegativeIntegerString" },
        "progressPercent": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "publicationVideoCreatedEventV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractVersion",
        "type",
        "publicationId",
        "attemptId",
        "videoId",
        "videoUrl",
        "createdAt"
      ],
      "properties": {
        "contractVersion": { "const": 1 },
        "type": { "const": "VIDEO_CREATED" },
        "publicationId": { "$ref": "#/$defs/uuid" },
        "attemptId": { "$ref": "#/$defs/uuid" },
        "videoId": { "type": "string", "pattern": "^[A-Za-z0-9_-]{6,64}$" },
        "videoUrl": { "type": "string", "format": "uri" },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "publicationUploadOutcomeUncertainEventV1": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractVersion",
        "type",
        "publicationId",
        "attemptId",
        "finalChunkDispatchedAt",
        "safeReasonCode",
        "requiredAction"
      ],
      "properties": {
        "contractVersion": { "const": 1 },
        "type": { "const": "UPLOAD_OUTCOME_UNCERTAIN" },
        "publicationId": { "$ref": "#/$defs/uuid" },
        "attemptId": { "$ref": "#/$defs/uuid" },
        "finalChunkDispatchedAt": { "type": "string", "format": "date-time" },
        "safeReasonCode": {
          "enum": [
            "FINAL_UPLOAD_RESULT_UNKNOWN",
            "SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH"
          ]
        },
        "requiredAction": {
          "const": "RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK"
        }
      }
    },
    "publicationProgressEventV1": {
      "oneOf": [
        { "$ref": "#/$defs/publicationUploadProgressEventV1" },
        { "$ref": "#/$defs/publicationUploadOutcomeUncertainEventV1" },
        { "$ref": "#/$defs/publicationVideoCreatedEventV1" }
      ]
    }
  }
}
```

Extend `packages/contracts/src/validate.ts` with a definition validator:

```ts
export function validateContractDefinition<T>(
  schemaName: string,
  definitionName: string,
  value: unknown,
): T {
  const validate = ajv.getSchema(
    `https://clip-factory.local/contracts/${schemaName}.schema.json#/$defs/${definitionName}`,
  );
  if (!validate) throw new Error(`unknown contract definition ${schemaName}.${definitionName}`);
  if (!validate(value)) throw new ContractValidationError(validate.errors ?? []);
  return value as T;
}
```

Create `packages/contracts/src/youtube-publishing.ts` with named wrappers:

```ts
import type {
  OAuthConnectionWorkflowInputV1,
  OAuthConnectionWorkflowResultV1,
  PublicationProgressEventV1,
  PublicationWorkflowInputV1,
  YouTubeConnectionEventV1,
} from './generated/youtube-publishing';
import { validateContractDefinition } from './validate';

export const parseOAuthConnectionWorkflowInputV1 = (value: unknown) =>
  validateContractDefinition<OAuthConnectionWorkflowInputV1>(
    'youtube-publishing',
    'oauthConnectionWorkflowInputV1',
    value,
  );

export const parseOAuthConnectionWorkflowResultV1 = (value: unknown) =>
  validateContractDefinition<OAuthConnectionWorkflowResultV1>(
    'youtube-publishing',
    'oauthConnectionWorkflowResultV1',
    value,
  );

export const parseYouTubeConnectionEventV1 = (value: unknown) =>
  validateContractDefinition<YouTubeConnectionEventV1>(
    'youtube-publishing',
    'youTubeConnectionEventV1',
    value,
  );

export const parsePublicationWorkflowInputV1 = (value: unknown) =>
  validateContractDefinition<PublicationWorkflowInputV1>(
    'youtube-publishing',
    'publicationWorkflowInputV1',
    value,
  );

export const parsePublicationProgressEventV1 = (value: unknown) =>
  validateContractDefinition<PublicationProgressEventV1>(
    'youtube-publishing',
    'publicationProgressEventV1',
    value,
  );
```

Register the schema with the existing Ajv instance, normalize the scheduled constraint diagnostic to `scheduled publication requires scheduleAtUtc and sourceTimezone`, and export wrappers/generated TypeScript symbols from `packages/contracts/src/index.ts`. Keep generated Pydantic models configured with `extra='forbid'` and the generator's Phase 1 aliases.

Run:

```bash
pnpm test:contracts
pnpm --filter @clip-factory/contracts exec vitest run src/youtube-publishing-contract.test.ts
uv run --directory apps/worker pytest tests/entrypoints/contracts/test_youtube_publishing_contract.py -q
```

Expected GREEN: all commands PASS and generated-output diff is current.

- [ ] **REFACTOR 1.5 — Keep IDs and validation authoritative without merging DTO groups.**

Extract only these repeated JSON Schema concepts and reference them from the same schema; do not export the Temporal metadata snapshot as an application Entity DTO:

```json
{
  "$defs": {
    "uuid": { "type": "string", "format": "uuid" },
    "objectKey": { "type": "string", "minLength": 1, "maxLength": 1024 },
    "microUsd": { "type": "string", "pattern": "^(0|[1-9][0-9]*)$" }
  }
}
```

Rerun the three GREEN commands after refactoring:

```bash
pnpm test:contracts
pnpm --filter @clip-factory/contracts exec vitest run src/youtube-publishing-contract.test.ts
uv run --directory apps/worker pytest tests/entrypoints/contracts/test_youtube_publishing_contract.py -q
```

## RED-GREEN-REFACTOR cycle 2: imports and credential-field leakage fail CI

- [ ] **RED 2.1 — Create a deliberately forbidden fixture and scanner test.**

Create `tests/architecture/fixtures/ts/youtube-sdk-leak.ts`:

```ts
import type { youtube_v3 } from 'googleapis';

export type LeakedVideo = youtube_v3.Schema$Video;
```

Create `scripts/check-youtube-boundaries.test.mjs`:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('application boundary scanner rejects Google SDK types', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/check-ts-boundaries.mjs', 'tests/architecture/fixtures/ts/youtube-sdk-leak.ts'],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Google SDK import is adapter-only/);
});
```

Run:

```bash
node --test scripts/check-youtube-boundaries.test.mjs
```

Expected RED: FAIL because the scanner currently accepts the `googleapis` type or ignores the explicit fixture path.

- [ ] **GREEN 2.2 — Extend all four enforcement points.**

Make these exact rules executable:

1. `.dependency-cruiser.cjs`: `youtube-publishing/domain` imports no outer layer; `application` imports only its own domain/ports and Phase 1 Entity/ID public exports; delivery and adapters are peers; only composition imports both. Reject cycles.
2. `scripts/check-ts-boundaries.mjs`: reject imports matching `googleapis`, `google-auth-library`, `openai`, `@prisma/client`, `@temporalio/client`, or files under `adapters/` from any `domain/`, `application/`, or `delivery/ui/` file. Reject names matching `/access_?token|refresh_?token|authorization_?code|code_?verifier|client_?secret/i` in API, Entity, Record, Temporal, or UI DTO declaration files.
3. `apps/web/eslint.config.mjs`: add `no-restricted-imports` with the same provider/framework packages for `src/modules/youtube-publishing/{domain,application,delivery/ui}/**/*.{ts,tsx}`.
4. `apps/worker/.importlinter`: add contracts so `clip_factory.domain.youtube_publishing`, `clip_factory.application.youtube_publishing`, and `clip_factory.ports.youtube_publishing` cannot import `keyring`, `httpx`, `openai`, `temporalio`, or `clip_factory.adapters.youtube`; workflow modules may import Temporal decorators/types but no adapter/provider packages.

Update `scripts/check-ts-boundaries.mjs` to accept optional file arguments, write the exact diagnostic `Google SDK import is adapter-only: <path>`, and exit `1` on the fixture. Update root `test:architecture` to run `node --test scripts/check-youtube-boundaries.test.mjs` before the full scanner.

Run:

```bash
node --test scripts/check-youtube-boundaries.test.mjs
pnpm test:architecture
```

Expected GREEN: the focused test PASSes by observing rejection; the production tree passes all dependency, cycle, DTO leak, ESLint, and Python import-linter checks. The intentionally invalid fixture must be excluded from the production-tree success scan and exercised only by the negative test.

- [ ] **REFACTOR 2.3 — Share forbidden-pattern data inside the scanner, not DTOs across layers.**

Use one immutable scanner pattern list for CLI and test execution. Keep ESLint/import-linter native configuration explicit because those tools have different semantics. Rerun `pnpm test:architecture`.

## Broader verification

- [ ] Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:contracts
pnpm test:architecture
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated
git diff --check
```

- [ ] Confirm `packages/contracts/schema/youtube-publishing.schema.json` has no property whose normalized name is `accessToken`, `refreshToken`, `authorizationCode`, `codeVerifier`, or `clientSecret`.
- [ ] Confirm no Phase 1 schema, generated type, DTO, migration, or application service was renamed or broadened.

## Review gate

A reviewer can approve this task only when malformed/credential-bearing payloads fail in both runtimes, generated output is reproducible, the negative import fixture is rejected for the intended reason, and the untouched production tree passes architecture checks.

## Suggested commit

```text
feat(contracts): define token-free YouTube publishing boundaries
```
