# Task 5: Generate Versioned Cross-Runtime Contracts

> **For agentic workers:** Use superpowers:test-driven-development. Edit schema sources only; generated TypeScript and Python are outputs and must never be hand-edited.

## Purpose and traceability

Implement design §22 and acceptance criterion 13 with JSON Schema 2020-12 as one authoritative source for workflow, progress, health, media, transcript, highlight, render, cost, and error payloads.

## Layers and boundaries

- JSON Schema is transport contract, not a domain model.
- Generated TS stays in `@clip-factory/contracts`; generated Pydantic stays under Python `entrypoints/contracts`.
- Explicit mappers introduced by later tasks translate contract payloads to Entity/domain values.

## Exact files

- Create: `packages/contracts/schema/schema-bodies.mjs`
- Generate: `packages/contracts/schema/common.schema.json`
- Generate: `packages/contracts/schema/workflow-input.schema.json`
- Generate: `packages/contracts/schema/workflow-result.schema.json`
- Generate: `packages/contracts/schema/progress-event.schema.json`
- Generate: `packages/contracts/schema/worker-health.schema.json`
- Generate: `packages/contracts/schema/media-probe.schema.json`
- Generate: `packages/contracts/schema/transcript.schema.json`
- Generate: `packages/contracts/schema/highlight-response.schema.json`
- Generate: `packages/contracts/schema/render-spec.schema.json`
- Generate: `packages/contracts/schema/cost-data.schema.json`
- Generate: `packages/contracts/schema/error.schema.json`
- Create: `packages/contracts/scripts/generate.mjs`, `packages/contracts/scripts/check-compatibility.mjs`, `packages/contracts/src/validate.ts`, `packages/contracts/src/validate.test.ts`, `packages/contracts/test-fixtures/valid-workflow.json`, `packages/contracts/test-fixtures/invalid-workflow.json`
- Generate: `packages/contracts/src/generated/workflow-input.ts`
- Generate: `packages/contracts/src/generated/workflow-result.ts`
- Generate: `packages/contracts/src/generated/progress-event.ts`
- Generate: `packages/contracts/src/generated/worker-health.ts`
- Generate: `packages/contracts/src/generated/media-probe.ts`
- Generate: `packages/contracts/src/generated/transcript.ts`
- Generate: `packages/contracts/src/generated/highlight-response.ts`
- Generate: `packages/contracts/src/generated/render-spec.ts`
- Generate: `packages/contracts/src/generated/cost-data.ts`
- Generate: `packages/contracts/src/generated/error.ts`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/workflow_input.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/workflow_result.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/progress_event.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/worker_health.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/media_probe.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/transcript.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/highlight_response.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/render_spec.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/cost_data.py`
- Generate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/error.py`
- Create: `apps/worker/tests/entrypoints/contracts/test_generated_contracts.py`
- Modify: `packages/contracts/package.json`, `packages/contracts/src/index.ts`, `apps/worker/pyproject.toml`, `package.json`
- Pin `ajv` `8.17.1`, `ajv-formats` `3.0.1`, `json-schema-to-typescript` `15.0.4`, and `datamodel-code-generator==0.35.0` without ranges.

## Prerequisites and produced interfaces

- Requires Tasks 1–3.
- Every root object has `schemaVersion: "1.0.0"` and `occurredAt` as UTC RFC 3339 where it is an event.
- Produces `validateContract(name, value)`, TS generated types, and Python Pydantic generated models.

## Contract field inventory

| Schema | Required fields beyond `schemaVersion` |
|---|---|
| `workflow-input` | `workflowId`, `projectId`, `sourceAssetId`, `mode`, `languageTag`, `maxClipSeconds`, `platformPreset`, `analysis` nullable object, `requestedAt` |
| `workflow-result` | `workflowId`, `projectId`, `status`, `transcriptObjectKey` nullable, `clipIds`, `error` nullable, `completedAt` |
| `progress-event` | `workflowId`, `projectId`, `scope`, `stage`, `completedUnits`, `totalUnits`, `unit`, `etaLowSeconds`, `etaHighSeconds`, `confidence`, `occurredAt` |
| `worker-health` | `workerId`, `status`, `hardware`, `ffmpegVersion`, immutable `transcriber` revision/hash and cache status, `openAiConfigured`, sanitized `openAiModelAccess`, `heartbeatAt` |
| `media-probe` | `durationMs`, `sizeBytes`, `container`, `video`, `audio`, `formatTags` |
| `transcript` | `transcriptId`, `languageTag`, `text`, `segments`, `words`, `backend`, `model`, `modelRevision`, `durationMs` |
| `highlight-response` | `analysisRunId`, `candidates`; candidate fields are `startMs`, `endMs`, `title`, `rationale`, `rank`, `overallScore`, and `scores` with `hook`, `coherence`, `payoff`, `novelty`, `energy`, `instructionFit`, `boundaryQuality` |
| `render-spec` | `renderId`, `clipId`, `source`, `canvas`, `range`, `cropTrack`, `captions`, `style`, `title`, `encoder`, `platformPreset` |
| `cost-data` | `analysisRunId`, `modelId`, `reasoning`, `pricingVersion`, `budgetMicrousd`, `reservedMicrousd`, `spentMicrousd`, `calls` |
| `error` | `code`, `category`, `retryable`, `message`, `requiredAction`, `details` |

IDs are UUID strings; durations/counts are nonnegative integers; money is nonnegative integer micro-USD; large object values use `{ "bucket": "clip-factory", "key": string, "versionId": string|null, "sha256": 64 lowercase hex }`.

## RED → GREEN → REFACTOR

- [ ] **RED: write validator behavior and fixtures before schemas or generator.**

```ts
// packages/contracts/src/validate.test.ts
import { describe, expect, it } from 'vitest';
import invalid from '../test-fixtures/invalid-workflow.json';
import valid from '../test-fixtures/valid-workflow.json';
import { validateContract } from './validate';

describe('validateContract', () => {
  it('accepts the versioned workflow input fixture', () => {
    expect(validateContract('workflow-input', valid)).toEqual(valid);
  });

  it('rejects unknown modes and additional properties', () => {
    expect(() => validateContract('workflow-input', invalid)).toThrow(/mode|additionalProperties/);
  });
});
```

`valid-workflow.json` contains a MANUAL local-file input with `analysis: null`; `invalid-workflow.json` is identical except `mode: "NO_AI"` and an extra `apiKey` property.

- [ ] Run `pnpm --filter @clip-factory/contracts test -- validate.test.ts`; expect FAIL because `validate.ts` is absent.

- [ ] **GREEN: create the exact first schema and validator.**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://clip-factory.local/contracts/progress-event/1.0.0",
  "title": "ProgressEvent",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "workflowId", "projectId", "scope", "stage", "completedUnits", "totalUnits", "unit", "etaLowSeconds", "etaHighSeconds", "confidence", "occurredAt"],
  "properties": {
    "schemaVersion": { "const": "1.0.0" },
    "workflowId": { "type": "string", "format": "uuid" },
    "projectId": { "type": "string", "format": "uuid" },
    "scope": { "enum": ["ANALYSIS", "RENDER"] },
    "stage": { "type": "string", "minLength": 1 },
    "completedUnits": { "type": "integer", "minimum": 0 },
    "totalUnits": { "type": "integer", "minimum": 1 },
    "unit": { "enum": ["BYTES", "MEDIA_MILLISECONDS", "WINDOWS", "FRAMES", "ITEMS"] },
    "etaLowSeconds": { "type": ["integer", "null"], "minimum": 0 },
    "etaHighSeconds": { "type": ["integer", "null"], "minimum": 0 },
    "confidence": { "enum": ["LOW", "MEDIUM", "HIGH", "NOT_APPLICABLE"] },
    "occurredAt": { "type": "string", "format": "date-time" }
  }
}
```

Create the remaining schema bodies from this complete executable source. `generate.mjs` serializes every value with `JSON.stringify(value, null, 2) + '\n'` to `<name>.schema.json` before language generation.

```js
// packages/contracts/schema/schema-bodies.mjs
const string = { type: 'string', minLength: 1 };
const integer = { type: 'integer', minimum: 0 };
const uuid = { type: 'string', format: 'uuid' };
const timestamp = { type: 'string', format: 'date-time' };
const nullable = (value) => ({ anyOf: [value, { type: 'null' }] });
const array = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const withModelReasoningCompatibility = (schema) => Object.assign(schema, { allOf: [
  { if: { properties: { modelId: { const: 'gpt-5.6-sol' } }, required: ['modelId'] }, then: { properties: { reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'] } } } },
  { if: { properties: { modelId: { const: 'gpt-5.5' } }, required: ['modelId'] }, then: { properties: { reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh'] } } } },
] });
const versioned = (title, properties, required = Object.keys(properties)) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://clip-factory.local/contracts/${title}/1.0.0`,
  title,
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion'].concat(required),
  properties: Object.assign({ schemaVersion: { const: '1.0.0' } }, properties),
});
const objectReference = object({ bucket: { const: 'clip-factory' }, key: string, versionId: nullable(string), sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' } });
const renderSource = { oneOf: [
  object({ kind: { const: 'LOCAL_FILE' }, sourceAssetId: uuid, fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }, sizeBytes: { type: 'integer', minimum: 1 }, modifiedAt: timestamp }),
  object({ kind: { const: 'BROWSER_UPLOAD' }, sourceAssetId: uuid, object: objectReference }),
] };
const error = object({ code: string, category: { enum: ['RETRYABLE', 'NON_RETRYABLE', 'WAITING', 'CANCELLED'] }, retryable: { type: 'boolean' }, message: string, requiredAction: nullable(string), details: { type: 'object', additionalProperties: true } });
const mediaVideo = object({ codec: string, width: { type: 'integer', minimum: 1 }, height: { type: 'integer', minimum: 1 }, frameRateNumerator: { type: 'integer', minimum: 1 }, frameRateDenominator: { type: 'integer', minimum: 1 } });
const mediaAudio = object({ codec: string, sampleRateHz: { type: 'integer', minimum: 1 }, channels: { type: 'integer', minimum: 1 } });
const transcriptWord = object({ text: string, startMs: integer, endMs: integer, confidenceMicros: nullable({ type: 'integer', minimum: 0, maximum: 1000000 }) });
const transcriptSegment = object({ text: string, startMs: integer, endMs: integer, wordStartIndex: integer, wordEndIndex: integer });
const score = { type: 'integer', minimum: 0, maximum: 1000000 };
const scores = object({ hook: score, coherence: score, payoff: score, novelty: score, energy: score, instructionFit: score, boundaryQuality: score });
const cropPoint = object({ timeMs: integer, centerXMicros: score, centerYMicros: score, confidenceMicros: score, source: { enum: ['SUBJECT_TRACK', 'CENTER_FALLBACK', 'MANUAL_FOCAL_POINT'] } });
const captionCue = object({ id: uuid, startMs: integer, endMs: integer, words: array(object({ text: string, startMs: integer, endMs: integer })) });
const captionStyle = object({ fontFamily: { enum: ['Inter', 'Arial', 'Helvetica Neue'] }, fontSizePx: { type: 'integer', minimum: 24, maximum: 160 }, textColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' }, outlineColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' }, backgroundColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' }, activeWordColor: { type: 'string', pattern: '^#[A-Fa-f0-9]{8}$' }, verticalPositionMicros: score, maxWordsPerLine: { type: 'integer', minimum: 1, maximum: 12 }, activeWordEmphasis: { type: 'boolean' } });
const jobState = { enum: ['DRAFT', 'VALIDATING_SOURCE', 'UPLOADING', 'QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'VERIFYING_BUDGET', 'AWAITING_BUDGET', 'PAID_CALL_UNCERTAIN', 'ANALYZING', 'GENERATING_PREVIEWS', 'AWAITING_REVIEW', 'RENDERING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SOURCE_MISSING', 'SOURCE_CHANGED', 'SOURCE_NOT_ALLOWED', 'RELINKING_SOURCE'] };

export const schemaBodies = {
  common: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://clip-factory.local/contracts/common/1.0.0',
    title: 'Common',
    $defs: { objectReference, error, mediaVideo, mediaAudio, transcriptWord, transcriptSegment, scores, cropPoint, captionCue, captionStyle, jobState },
  },
  'workflow-input': versioned('WorkflowInput', {
    workflowId: uuid,
    projectId: uuid,
    sourceAssetId: uuid,
    mode: { enum: ['AI_HIGHLIGHTS', 'MANUAL'] },
    languageTag: { type: 'string', pattern: '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$' },
    maxClipSeconds: { type: 'integer', minimum: 1, maximum: 10800 },
    platformPreset: { enum: ['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK'] },
    analysis: nullable(withModelReasoningCompatibility(object({ modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] }, reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'] }, budgetMicrousd: integer, maximumClips: { type: 'integer', minimum: 1, maximum: 50 }, instruction: nullable({ type: 'string', maxLength: 2000 }), coverageStartMs: integer, coverageEndMs: integer }))),
    requestedAt: timestamp,
  }),
  'workflow-result': versioned('WorkflowResult', {
    workflowId: uuid,
    projectId: uuid,
    status: { enum: ['COMPLETED', 'FAILED', 'CANCELLED'] },
    transcriptObject: nullable(objectReference),
    clipIds: array(uuid),
    error: nullable(error),
    completedAt: timestamp,
  }),
  'progress-event': versioned('ProgressEvent', {
    workflowId: uuid,
    projectId: uuid,
    scope: { enum: ['ANALYSIS', 'RENDER'] },
    stage: string,
    completedUnits: integer,
    totalUnits: { type: 'integer', minimum: 1 },
    unit: { enum: ['BYTES', 'MEDIA_MILLISECONDS', 'WINDOWS', 'FRAMES', 'ITEMS'] },
    etaLowSeconds: nullable(integer),
    etaHighSeconds: nullable(integer),
    confidence: { enum: ['LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE'] },
    occurredAt: timestamp,
  }),
  'worker-health': versioned('WorkerHealth', {
    workerId: uuid,
    status: { enum: ['ONLINE', 'DEGRADED', 'OFFLINE'] },
    hardware: object({ architecture: { const: 'arm64' }, chip: string, memoryBytes: { type: 'integer', minimum: 1 } }),
    ffmpegVersion: string,
    transcriber: object({ backend: { enum: ['MLX_WHISPER', 'FAKE'] }, model: string, revision: string, weightsSha256: nullable({ type: 'string', pattern: '^[0-9a-f]{64}$' }), cacheStatus: { enum: ['READY', 'MISSING', 'INVALID', 'NOT_APPLICABLE'] } }),
    openAiConfigured: { type: 'boolean' },
    openAiModelAccess: array(object({ modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] }, status: { enum: ['AVAILABLE', 'NOT_ENTITLED', 'NOT_FOUND', 'UNKNOWN'] }, checkedAt: nullable(timestamp) })),
    heartbeatAt: timestamp,
  }),
  'media-probe': versioned('MediaProbe', {
    durationMs: { type: 'integer', minimum: 1 },
    sizeBytes: { type: 'integer', minimum: 1 },
    container: { enum: ['mp4', 'mov', 'matroska', 'webm'] },
    video: mediaVideo,
    audio: mediaAudio,
    formatTags: { type: 'object', additionalProperties: { type: 'string' } },
  }),
  transcript: versioned('Transcript', {
    transcriptId: uuid,
    languageTag: string,
    text: { type: 'string' },
    segments: array(transcriptSegment),
    words: array(transcriptWord),
    backend: { enum: ['MLX_WHISPER', 'FAKE'] },
    model: string,
    modelRevision: string,
    durationMs: integer,
  }),
  'highlight-response': versioned('HighlightResponse', {
    analysisRunId: uuid,
    candidates: array(object({ startMs: integer, endMs: integer, title: { type: 'string', minLength: 1, maxLength: 120 }, rationale: { type: 'string', minLength: 1, maxLength: 1000 }, rank: { type: 'integer', minimum: 1 }, overallScore: score, scores })),
  }),
  'render-spec': versioned('RenderSpec', {
    renderId: uuid,
    clipId: uuid,
    source: renderSource,
    canvas: object({ width: { const: 1080 }, height: { const: 1920 } }),
    range: object({ startMs: integer, endMs: integer }),
    cropTrack: array(cropPoint),
    captions: array(captionCue),
    style: captionStyle,
    title: nullable({ type: 'string', maxLength: 120 }),
    encoder: object({ strategy: { enum: ['VIDEOTOOLBOX', 'SOFTWARE'] }, videoCodec: { const: 'h264' }, audioCodec: { const: 'aac' }, pixelFormat: { const: 'yuv420p' } }),
    platformPreset: { enum: ['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK'] },
  }),
  'cost-data': withModelReasoningCompatibility(versioned('CostData', {
    analysisRunId: uuid,
    modelId: { enum: ['gpt-5.6-sol', 'gpt-5.5'] },
    reasoning: { enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'] },
    pricingVersion: { const: 'openai-2026-07-11.1' },
    budgetMicrousd: integer,
    reservedMicrousd: integer,
    spentMicrousd: integer,
    calls: array(object({ purpose: { enum: ['HIGHLIGHT_WINDOW', 'GLOBAL_RANKING'] }, responseId: string, inputTokens: integer, cachedInputTokens: integer, cacheWriteInputTokens: integer, outputTokens: integer, reasoningTokens: integer, costMicrousd: integer })),
  })),
  error: versioned('ErrorEnvelope', { error }),
};
```

Create the validator exactly as follows.

```ts
// packages/contracts/src/validate.ts
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { AnySchema } from 'ajv';
import common from '../schema/common.schema.json';
import costData from '../schema/cost-data.schema.json';
import error from '../schema/error.schema.json';
import highlightResponse from '../schema/highlight-response.schema.json';
import mediaProbe from '../schema/media-probe.schema.json';
import progressEvent from '../schema/progress-event.schema.json';
import renderSpec from '../schema/render-spec.schema.json';
import transcript from '../schema/transcript.schema.json';
import workerHealth from '../schema/worker-health.schema.json';
import workflowInput from '../schema/workflow-input.schema.json';
import workflowResult from '../schema/workflow-result.schema.json';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(common as AnySchema);
const entries = { 'cost-data': costData, error, 'highlight-response': highlightResponse, 'media-probe': mediaProbe, 'progress-event': progressEvent, 'render-spec': renderSpec, transcript, 'worker-health': workerHealth, 'workflow-input': workflowInput, 'workflow-result': workflowResult } as const;
const validators = new Map(Object.entries(entries).map(([name, schema]) => [name, ajv.compile(schema as AnySchema)]));

export function validateContract(name: keyof typeof entries, value: unknown): unknown {
  const validate = validators.get(name);
  if (!validate) throw new Error(`Unknown contract: ${name}`);
  if (!validate(value)) throw new Error(ajv.errorsText(validate.errors, { separator: '; ' }));
  return value;
}
```

- [ ] Run the TS test; expect PASS. Run `pnpm --filter @clip-factory/contracts exec ajv validate -s schema/workflow-input.schema.json -d test-fixtures/valid-workflow.json`; expect valid.

- [ ] **RED: require deterministic generation in both runtimes.**

```python
# apps/worker/tests/entrypoints/contracts/test_generated_contracts.py
from clip_factory.entrypoints.contracts.generated.workflow_input import WorkflowInput


def test_generated_python_rejects_an_unknown_project_mode() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "workflowId": "00000000-0000-4000-8000-000000000001",
        "projectId": "00000000-0000-4000-8000-000000000002",
        "sourceAssetId": "00000000-0000-4000-8000-000000000003",
        "mode": "NO_AI",
        "languageTag": "en",
        "maxClipSeconds": 60,
        "platformPreset": "YOUTUBE_SHORTS",
        "analysis": None,
        "requestedAt": "2026-07-11T00:00:00Z",
    }
    try:
        WorkflowInput.model_validate(payload)
    except ValueError as error:
        assert "mode" in str(error)
    else:
        raise AssertionError("unknown mode was accepted")
```

- [ ] Run `uv run --directory apps/worker pytest tests/entrypoints/contracts/test_generated_contracts.py -q`; expect import FAIL because generated Python does not exist.

- [ ] **GREEN: create the deterministic generator.**

```js
// packages/contracts/scripts/generate.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { schemaBodies } from '../schema/schema-bodies.mjs';

const root = resolve(import.meta.dirname, '..');
const worker = resolve(root, '../../apps/worker');
const names = Object.keys(schemaBodies).sort();
await mkdir(resolve(root,'src/generated'),{recursive:true});
await mkdir(resolve(worker,'src/clip_factory/entrypoints/contracts/generated'),{recursive:true});
const manifest = {};
for (const name of names) {
  const schemaPath = resolve(root,`schema/${name}.schema.json`);
  const schemaText = `${JSON.stringify(schemaBodies[name],null,2)}\n`;
  await writeFile(schemaPath,schemaText);
  manifest[name] = createHash('sha256').update(schemaText).digest('hex');
  if (name !== 'common') {
    execFileSync('pnpm',['exec','json2ts','--input',schemaPath,'--output',resolve(root,`src/generated/${name}.ts`),'--bannerComment','// Generated from Clip Factory contract 1.0.0. Do not edit.'],{stdio:'inherit'});
    execFileSync('uv',['run','--directory',worker,'datamodel-codegen','--input',schemaPath,'--input-file-type','jsonschema','--output',resolve(worker,`src/clip_factory/entrypoints/contracts/generated/${name.replaceAll('-','_')}.py`),'--output-model-type','pydantic_v2.BaseModel','--target-python-version','3.12','--disable-timestamp'],{stdio:'inherit'});
  }
}
await writeFile(resolve(root,'src/generated/manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
await writeFile(resolve(worker,'src/clip_factory/entrypoints/contracts/generated/manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
```

- [ ] Run `pnpm --filter @clip-factory/contracts generate && uv run --directory apps/worker pytest tests/entrypoints/contracts/test_generated_contracts.py -q`; expect PASS.

- [ ] **REFACTOR:** add valid workflow/cost fixtures for `gpt-5.6-sol`/`max` and `gpt-5.5`/`xhigh`, plus invalid fixtures proving `gpt-5.5`/`max` is rejected identically in TypeScript and Python. Add backward-compatibility checks that reject required-field removal, enum narrowing, or type narrowing without a major schema version. Generate twice and assert byte-identical output.

## Broader verification

```bash
pnpm test:contracts
pnpm test:architecture
pnpm --filter @clip-factory/contracts generate
git diff --exit-code -- packages/contracts/src/generated apps/worker/src/clip_factory/entrypoints/contracts/generated
git diff --check
```

Expected: all pass; generation is clean; invalid fixtures fail in both runtimes for the same field.

**Suggested commit:** `feat: add versioned cross-runtime contracts`
