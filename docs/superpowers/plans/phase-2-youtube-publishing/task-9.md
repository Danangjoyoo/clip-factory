# Task 9: Separately Costed OpenAI Metadata Generation

> **Implementation mode:** Complete after Tasks 1, 2, 4, and 6. This task implements generation and exact usage persistence; editing/approval UI is Task 10.

## Purpose

Generate one new, editable metadata-draft version from clip transcript text only, behind an action-specific estimate/cap confirmation. Persist one exact immutable `AIUsageEvent` and never overwrite an older draft or make an OpenAI call for manual editing.

## Requirements and traceability

- YouTube design §6: per-clip paid action, clip transcript/project context/instruction, selected model/reasoning/cap, conservative estimate, confirmation, versioned result, exact usage/cost.
- YouTube design §§13, 17–19: `PublishingMetadataGenerator` port, separate client DTOs/converters, fake OpenAI, money attribution, no SDK leak.
- Core design §§6, 11, 13.3–13.5, 22, 30 and decisions 67–68: consume the versioned Phase 1 model/pricing catalog, non-inference access projection, cost calculator, and per-model cache policy; never duplicate rates or silently substitute model/reasoning.
- Acceptance criterion 5: generated metadata is editable, separately costed, and cannot publish without approval.

## Clean Architecture ownership

- **Web application:** estimate/cap/idempotency/version orchestration; draft/usage persistence through existing data services and unit-of-work port; Temporal scheduling port.
- **Worker application:** prompt assembly, exact pre-call budget gate, `PublishingMetadataGenerator` port, result reporting.
- **Adapters:** OpenAI Responses SDK and Temporal client only; OpenAI Client DTOs convert explicitly to worker Entity/result types.
- **DTO separation:** public API request, web Entity request, Temporal input/result, OpenAI Structured Output/client usage, Record DTO, and UI model are distinct.

## Files

- Modify: `packages/contracts/schema/schema-bodies.mjs`
- Regenerate: `packages/contracts/schema/youtube-publishing.schema.json`
- Regenerate: `packages/contracts/src/generated/youtube-publishing.ts`
- Regenerate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/youtube_publishing.py`
- Create: `prisma/migrations/20260712000350_phase_2_metadata_usage_scope/migration.sql`
- Modify: `prisma/schema.prisma`
- Regenerate: `apps/web/src/generated/prisma/models/AIUsageEvent.ts`
- Regenerate: `apps/web/src/generated/prisma/models/PaidCallReservation.ts`
- Regenerate: `apps/web/src/generated/prisma/models/Project.ts`
- Regenerate: `apps/web/src/generated/prisma/models/Clip.ts`
- Modify: `apps/web/src/modules/analysis/application/dto/entity/ai-usage-event-entity.dto.ts`
- Create: `apps/web/src/modules/analysis/application/dto/entity/paid-call-reservation-entity.dto.ts`
- Modify: `apps/web/src/modules/analysis/application/dto/entity/index.ts`
- Modify: `apps/web/src/modules/analysis/application/ports/ai-usage-event.repository.ts`
- Modify: `apps/web/src/modules/analysis/application/ports/paid-call-reservation.repository.ts`
- Modify: `apps/web/src/modules/analysis/application/data-services/ai-usage-event.data-service.ts`
- Modify: `apps/web/src/modules/analysis/application/data-services/paid-call-reservation.data-service.ts`
- Modify: `apps/web/src/modules/analysis/adapters/persistence/dto/record/ai-usage-event-record.dto.ts`
- Modify: `apps/web/src/modules/analysis/adapters/persistence/dto/record/paid-call-reservation-record.dto.ts`
- Modify: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-ai-usage-event.repository.ts`
- Modify: `apps/web/src/modules/analysis/adapters/persistence/repositories/prisma-paid-call-reservation.repository.ts`
- Modify: `apps/web/src/modules/analysis/converters/entity-record/ai-usage-event.converter.ts`
- Create: `apps/web/src/modules/analysis/converters/entity-record/paid-call-reservation.converter.ts`
- Create: `apps/web/src/modules/analysis/converters/entity-record/paid-call-reservation.converter.test.ts`
- Modify: `apps/web/src/modules/analysis/application/services/record-usage.service.test.ts`
- Modify: `apps/web/src/modules/analysis/composition/analysis.composition.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/publishing-metadata-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/generate-publishing-metadata.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/generate-publishing-metadata.service.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/ports/publishing-metadata-draft.repository.ts`
- Modify: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publishing-metadata-draft.repository.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/clients/temporal-publishing-metadata-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/generate-metadata-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/generate-metadata.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/metadata-generations/estimate/route.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/metadata-generations/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/metadata-generations/results/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/metadata-generations/usage/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts`
- Create: `apps/worker/src/clip_factory/application/youtube_publishing/metadata_generation_service.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/publishing_metadata_generator.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/openai_metadata_generator.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/openai_client_dto.py`
- Create: `apps/worker/src/clip_factory/converters/youtube_publishing/client_entity/openai_metadata.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/metadata_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/metadata_activities.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/metadata_usage_recorder.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/metadata_result_reporter.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/metadata_callback_http_adapter.py`
- Create: `apps/worker/tests/application/youtube_publishing/test_metadata_generation_service.py`
- Create: `apps/worker/tests/adapters/youtube/test_openai_metadata_generator.py`
- Create: `apps/worker/tests/adapters/youtube/test_metadata_callback_http_adapter.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py`
- Create: `tests/integration/youtube-publishing/metadata-generation.test.ts`
- Create: `tests/integration/youtube-publishing/support/metadata-generation-harness.ts`
- Modify: `tests/integration/support/test-environment.ts`
- Modify: `tests/integration/analysis/usage-persistence.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`

## Prerequisites

- Phase 1 pricing/model catalog exposes `gpt-5.6-sol`/high as the default and `gpt-5.5` as an explicit fallback, including each model's compatible reasoning profiles and single `maxGeneratedTokens` cap.
- Phase 1 model-access projection exposes `AVAILABLE`, `NOT_ENTITLED`, `NOT_FOUND`, or `CHECK_UNAVAILABLE` from the non-inference `models.retrieve` check. Phase 2 reads that projection before reservation and never probes by inference or infers access from credits.
- Phase 1 cost calculator remains the only rate implementation. The catalog snapshot—not this module—contains input/cached/output rates, cache-write multiplier, long-context tiers, and prompt-cache policy.
- Task 4 can insert versioned drafts and link exact `AIUsageEvent` IDs.

## Interfaces

Web scheduler:

```ts
export interface PublishingMetadataWorkflowScheduler {
  start(input: MetadataGenerationWorkflowInputV1): Promise<WorkflowId>;
}
```

Worker port:

```python
from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class MetadataGenerationRequest:
    model_id: str
    reasoning_level: str
    system_prompt: str
    transcript_text: str
    project_context: str
    instruction: str | None
    max_generated_tokens: int
    prompt_cache_policy: Literal['EXPLICIT_DISABLED', 'LEGACY_AUTOMATIC_NO_WRITE_FEE']


@dataclass(frozen=True, slots=True)
class PublishingMetadataProviderResponse:
    provider_response_id: str
    output: object
    refusal: str | None
    input_tokens: int
    cached_input_tokens: int
    cache_write_input_tokens: int
    output_tokens: int
    reasoning_tokens: int


@dataclass(frozen=True, slots=True)
class MetadataUsageRecord:
    project_id: str
    clip_id: str
    draft_id: str
    call_id: str
    request_hash: str
    purpose: Literal['YOUTUBE_METADATA_GENERATION']
    model_id: str
    reasoning_level: str
    prompt_version: str
    schema_version: str
    pricing_version: str
    response: PublishingMetadataProviderResponse


class PublishingMetadataGenerator(Protocol):
    async def generate(
        self,
        request: MetadataGenerationRequest,
    ) -> PublishingMetadataProviderResponse:
        raise NotImplementedError


class MetadataUsageRecorder(Protocol):
    async def record_before_output_validation(
        self,
        record: MetadataUsageRecord,
    ) -> None:
        raise NotImplementedError


class MetadataResultReporter(Protocol):
    async def report(
        self,
        result: 'MetadataGenerationResultEntity',
    ) -> None:
        raise NotImplementedError
```

`MetadataGenerationResultEntity` is the application union for validated success or `PAID_CALL_UNCERTAIN`; the HTTP adapter converts it to the generated contract instead of letting generated API types enter application code.

## RED-GREEN-REFACTOR cycle 1: estimate/cap confirmation, versioning, and idempotency

- [ ] **RED 1.1 — Write web application tests first.**

Create `generate-publishing-metadata.service.test.ts`:

```ts
import { expect, it, vi } from 'vitest';

import { GeneratePublishingMetadataService } from './generate-publishing-metadata.service';

const request = {
  projectId: projectId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb70'),
  clipId: clipId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb71'),
  modelId: 'gpt-5.6-sol',
  reasoningLevel: 'high',
  maxCostMicrousd: 50_000n,
  confirmedEstimateMicrousd: 30_000n,
  instruction: 'Emphasize the counterintuitive lesson.',
  idempotencyKey: 'metadata:clip-1:request-1',
  priorUncertainAttemptId: null,
  possiblePriorSpendAcknowledged: false,
} as const;

it('refuses an unconfirmed or stale estimate before scheduling OpenAI', async () => {
  const dependencies = makeGenerationDependencies({ estimateMicrousd: 30_001n });
  const service = new GeneratePublishingMetadataService(dependencies);
  await expect(service.generate(request)).rejects.toMatchObject({
    code: 'METADATA_ESTIMATE_CHANGED',
    estimateMicrousd: 30_001n,
  });
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
  expect(dependencies.drafts.insertVersion).not.toHaveBeenCalled();
});

it('refuses a cap below the 1.5x worst-case reserve', async () => {
  const dependencies = makeGenerationDependencies({
    estimateMicrousd: 30_000n,
    reservedWorstCaseMicrousd: 60_000n,
  });
  const service = new GeneratePublishingMetadataService(dependencies);
  await expect(service.generate(request)).rejects.toMatchObject({
    code: 'METADATA_BUDGET_TOO_LOW',
  });
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
});

it('creates version two and starts one token-free workflow', async () => {
  const dependencies = makeGenerationDependencies({
    latestDraft: makeDraftEntity({ version: 1 }),
    estimateMicrousd: 30_000n,
    reservedWorstCaseMicrousd: 45_000n,
  });
  const service = new GeneratePublishingMetadataService(dependencies);
  await expect(service.generate(request)).resolves.toMatchObject({
    draftVersion: 2,
    estimateMicrousd: 30_000n,
  });
  expect(dependencies.scheduler.start).toHaveBeenCalledWith(expect.objectContaining({
    contractVersion: 1,
    projectId: request.projectId,
    clipId: request.clipId,
    callId: expect.any(String),
    requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    transcriptObject: {
      bucket: 'clip-factory',
      key: 'transcripts/project-1/v1.json',
      versionId: 'transcript-version-1',
      sha256: 'a'.repeat(64),
    },
    modelId: 'gpt-5.6-sol',
    reasoningLevel: 'high',
    modelCatalogVersion: '2026-07-11.1',
    pricingVersion: 'openai-2026-07-11.1',
    maxGeneratedTokens: 32_768,
    promptCachePolicy: 'EXPLICIT_DISABLED',
    maxCostMicrousd: '50000',
  }));
  const reservation = dependencies.reservations.create.mock.calls[0][0];
  const workflowInput = dependencies.scheduler.start.mock.calls[0][0];
  expect(reservation).toMatchObject({
    projectId: request.projectId,
    analysisRunId: null,
    clipId: request.clipId,
    purpose: 'YOUTUBE_METADATA_GENERATION',
    callId: expect.any(String),
    requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    worstCaseMicrousd: 45_000n,
  });
  expect(workflowInput.callId).toBe(reservation.callId);
  expect(workflowInput.requestHash).toBe(reservation.requestHash);
  expect(JSON.stringify(dependencies.scheduler.start.mock.calls)).not.toContain('transcript text');
});

it('returns the same draft/workflow for the same idempotency key', async () => {
  const dependencies = makeGenerationDependencies({
    idempotencyReceipt: {
      resourceId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb72',
      workflowId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb73',
    },
  });
  const service = new GeneratePublishingMetadataService(dependencies);
  const result = await service.generate(request);
  expect(result.draftId).toBe(dependencies.idempotencyReceipt.resourceId);
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
});

it('requires a new reservation and possible-spend acknowledgement after uncertainty', async () => {
  const dependencies = makeGenerationDependencies({
    uncertainAttempt: {
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb79',
      state: 'PAID_CALL_UNCERTAIN',
      reservedMicrousd: 45_000n,
    },
  });
  const service = new GeneratePublishingMetadataService(dependencies);
  await expect(service.generate({
    ...request,
    idempotencyKey: 'metadata:clip-1:request-2',
    priorUncertainAttemptId: dependencies.uncertainAttempt.id,
    possiblePriorSpendAcknowledged: false,
  })).rejects.toMatchObject({ code: 'POSSIBLE_PRIOR_SPEND_ACKNOWLEDGEMENT_REQUIRED' });
  expect(dependencies.reservations.create).not.toHaveBeenCalled();
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
});

it.each([
  ['gpt-5.6-sol', 'high'],
  ['gpt-5.5', 'high'],
] as const)('schedules the explicitly selected available model %s', async (modelId, reasoningLevel) => {
  const dependencies = makeGenerationDependencies({
    modelAccess: { [modelId]: 'AVAILABLE' },
    estimateMicrousd: 30_000n,
    reservedWorstCaseMicrousd: 45_000n,
  });
  await new GeneratePublishingMetadataService(dependencies).generate({
    ...request,
    modelId,
    reasoningLevel,
  });
  expect(dependencies.scheduler.start).toHaveBeenCalledWith(expect.objectContaining({
    modelId,
    reasoningLevel,
  }));
});

it('blocks unavailable GPT-5.6 without silently selecting GPT-5.5', async () => {
  const dependencies = makeGenerationDependencies({
    modelAccess: { 'gpt-5.6-sol': 'NOT_ENTITLED', 'gpt-5.5': 'AVAILABLE' },
  });
  await expect(new GeneratePublishingMetadataService(dependencies).generate(request))
    .rejects.toMatchObject({ code: 'MODEL_NOT_ENTITLED', modelId: 'gpt-5.6-sol' });
  expect(dependencies.reservations.create).not.toHaveBeenCalled();
  expect(dependencies.scheduler.start).not.toHaveBeenCalled();
});
```

- [ ] **RED 1.2 — Witness missing service.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/generate-publishing-metadata.service.test.ts
```

Expected RED: service/port signature shells collect; a confirmed request creates zero paid-call reservations instead of one durable reservation before scheduling.

- [ ] **GREEN 1.3 — Implement estimate and start policy.**

The service loads the Phase 1 clip/project/transcript reference through narrow read ports, validates that the clip belongs to the project, validates the exact selected model/reasoning against the Phase 1 catalog, and requires that model's Phase 1 access projection to be `AVAILABLE` before any reservation. `NOT_ENTITLED`, `NOT_FOUND`, and `CHECK_UNAVAILABLE` become distinct safe blocking errors; none selects another model. It derives the prompt ceiling and the selected profile's single `maxGeneratedTokens` cap, calls the Phase 1 decimal-safe cost calculator, and compares both the displayed estimate and `1.5 * worstCase`. The one generated-token cap includes reasoning, visible output, and formatting; never add a separate reasoning ceiling or reserve. It durably creates a scoped paid-call reservation with the same `projectId`, `clipId`, `callId`, `requestHash`, and purpose `YOUTUBE_METADATA_GENERATION` that will be sent to the workflow; `analysisRunId` is null because manual-origin clips legitimately have no analysis run. It then creates a new draft ID/version with source `OPENAI`, state `METADATA_DRAFT`, empty editable fields, selected provenance, exact estimate/cap, and zero actual cost inside the existing Phase 1 unit-of-work/idempotency receipt. It schedules the token-free Task 1 payload only after reservation commit. If scheduling fails before provider transmission, it records a sanitized job failure and releases according to the Phase 1 reservation policy without deleting older drafts. A request following `PAID_CALL_UNCERTAIN` must use a new idempotency key/reservation and `possiblePriorSpendAcknowledged: true`; it never reuses or clears the uncertain reservation.

Add this exact cap helper inside the service module:

```ts
export function assertMetadataBudget(input: {
  confirmedEstimateMicrousd: bigint;
  currentEstimateMicrousd: bigint;
  worstCaseMicrousd: bigint;
  maxCostMicrousd: bigint;
}): void {
  if (input.confirmedEstimateMicrousd !== input.currentEstimateMicrousd) {
    throw new MetadataEstimateChangedError(input.currentEstimateMicrousd);
  }
  const reserved = (input.worstCaseMicrousd * 3n + 1n) / 2n;
  if (reserved > input.maxCostMicrousd) throw new MetadataBudgetTooLowError(reserved);
}
```

Run the focused test. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Keep pricing authoritative in Phase 1.**

Append this dependency test:

```ts
it('takes model rates from the Phase 1 catalog port', async () => {
  const base = makeGenerationDependencies({ inputMicrousdPerMillion: 5_000_000n });
  const changed = makeGenerationDependencies({ inputMicrousdPerMillion: 10_000_000n });
  const baseEstimate = await new GeneratePublishingMetadataService(base).estimate(request);
  const changedEstimate = await new GeneratePublishingMetadataService(changed).estimate(request);
  expect(changedEstimate.estimateMicrousd).toBeGreaterThan(baseEstimate.estimateMicrousd);
  expect(base.catalog.getPricingSnapshot).toHaveBeenCalledWith('gpt-5.6-sol');
});
```

Append the access-projection call assertion:

```ts
expect(base.modelAccess.get).toHaveBeenCalledWith('gpt-5.6-sol');
expect(base.modelAccess.get).toHaveBeenCalledBefore(base.reservations.create);
```

Witness RED if a local numeric rate makes both estimates equal or a reservation precedes access validation, delete the duplicate constant, and rerun. The only Phase 2 constants are the output schema and approved 1.5 safety factor; all model IDs/profiles/caps/cache policy come from Phase 1.

## RED-GREEN-REFACTOR cycle 2: worker pre-call gate and OpenAI adapter

- [ ] **RED 2.1 — Write worker application tests before adapter code.**

Create `test_metadata_generation_service.py`:

```python
from decimal import Decimal

import pytest

from clip_factory.application.youtube_publishing.metadata_generation_service import (
    MetadataGenerationService,
    MetadataGenerationBudgetError,
)


@pytest.mark.asyncio
async def test_checks_exact_planned_prompt_before_openai_call() -> None:
    fakes = make_metadata_generation_fakes(
        exact_worst_case_cost=Decimal('0.040000'),
        maximum_cost=Decimal('0.050000'),
    )
    service = MetadataGenerationService(**fakes.dependencies)
    result = await service.generate(fakes.input)
    assert result.title == 'A useful title'
    assert fakes.generator.requests[0].transcript_text == 'Only the selected clip transcript.'


@pytest.mark.asyncio
async def test_stops_before_openai_when_1_5x_exact_plan_exceeds_cap() -> None:
    fakes = make_metadata_generation_fakes(
        exact_worst_case_cost=Decimal('0.040001'),
        maximum_cost=Decimal('0.060000'),
    )
    service = MetadataGenerationService(**fakes.dependencies)
    with pytest.raises(MetadataGenerationBudgetError):
        await service.generate(fakes.input)
    assert fakes.generator.requests == []


@pytest.mark.asyncio
async def test_reads_transcript_range_and_never_media() -> None:
    fakes = make_metadata_generation_fakes()
    service = MetadataGenerationService(**fakes.dependencies)
    await service.generate(fakes.input)
    assert fakes.object_store.read_references == [make_transcript_object_reference()]
    assert fakes.object_store.media_reads == []


@pytest.mark.asyncio
async def test_persists_response_usage_before_rejecting_invalid_metadata_output() -> None:
    fakes = make_metadata_generation_fakes(
        provider_response=make_provider_response(
            provider_response_id='resp_invalid_metadata_1',
            output={'title': 7},
            input_tokens=1200,
            cached_input_tokens=0,
            cache_write_input_tokens=0,
            output_tokens=160,
            reasoning_tokens=80,
        ),
    )
    service = MetadataGenerationService(**fakes.dependencies)
    with pytest.raises(MetadataSchemaError):
        await service.generate(fakes.input)
    assert fakes.operation_order == ['provider_response', 'usage_recorded', 'output_validation']
    assert fakes.usage_recorder.events[0].provider_response_id == 'resp_invalid_metadata_1'
    assert fakes.usage_recorder.events[0].output_tokens == 160
```

- [ ] **RED 2.2 — Witness missing worker service.**

```bash
uv run --directory apps/worker pytest tests/application/youtube_publishing/test_metadata_generation_service.py -q
```

Expected RED: worker service/port signature shells collect; the accepted exact plan records zero generator requests instead of one transcript-only request.

- [ ] **GREEN 2.3 — Implement transcript-only prompt and exact gate.**

The worker loads the versioned transcript object, selects words within the clip's accepted bounds, builds a versioned system prompt plus project context/instruction, tokenizes the exact planned input through the Phase 1 tokenizer port, obtains price rules from the Phase 1 catalog snapshot included by reference/version, and checks:

```python
from decimal import Decimal


def assert_exact_metadata_budget(
    worst_case_cost: Decimal,
    maximum_cost: Decimal,
) -> None:
    if worst_case_cost * Decimal('1.5') > maximum_cost:
        raise MetadataGenerationBudgetError('exact metadata plan exceeds confirmed cap')
```

Only after that check call `PublishingMetadataGenerator.generate`. On a received response, durably record provider response ID, complete token categories, calculated cost, and reservation completion through `MetadataUsageRecorder` before parsing or validating `response.output`. Only after the recorder acknowledges may `parsePublishingMetadataProviderOutput` validate title 100 code points, description 5000 UTF-8 bytes, at most eight relevant no-space hashtags, keyword accounting at most 500, category/language/audience booleans. Provider output never selects visibility/schedule. A schema-invalid response therefore still has exact immutable usage; any permitted validation retry requires a separately reserved Phase 1 call.

```python
response = await self._generator.generate(request)
await self._usage_recorder.record_before_output_validation(
    MetadataUsageRecord(
        project_id=input.project_id,
        clip_id=input.clip_id,
        draft_id=input.draft_id,
        call_id=input.call_id,
        request_hash=input.request_hash,
        purpose='YOUTUBE_METADATA_GENERATION',
        model_id=input.model_id,
        reasoning_level=input.reasoning_level,
        prompt_version=YOUTUBE_METADATA_PROMPT_VERSION,
        schema_version=YOUTUBE_METADATA_SCHEMA_VERSION,
        pricing_version=input.pricing_version,
        response=response,
    ),
)
if response.refusal is not None:
    raise MetadataRefusalError('provider refused metadata generation')
metadata = parse_publishing_metadata_provider_output(response.output)
return GeneratedPublishingMetadataResult(
    provider_response_id=response.provider_response_id,
    metadata=metadata,
)
```

Run the worker service test. Expected GREEN: PASS.

- [ ] **RED 2.4 — Write OpenAI adapter tests against a complete fake Responses client.**

Create `test_openai_metadata_generator.py`:

```python
@pytest.mark.asyncio
async def test_uses_structured_output_and_maps_complete_usage() -> None:
    client = FakeResponsesClient(response=make_complete_metadata_response())
    generator = OpenAIPublishingMetadataGenerator(client)
    result = await generator.generate(make_metadata_request())
    assert client.requests[0]['model'] == 'gpt-5.6-sol'
    assert client.requests[0]['reasoning'] == {'effort': 'high'}
    assert client.requests[0]['max_output_tokens'] == make_metadata_request().max_generated_tokens
    assert client.requests[0]['store'] is False
    assert client.requests[0]['prompt_cache_options'] == {'mode': 'explicit'}
    assert 'prompt_cache_breakpoint' not in json.dumps(client.requests[0])
    assert client.requests[0]['text']['format']['name'] == 'youtube_publishing_metadata_v1'
    assert result.provider_response_id == 'resp_metadata_1'
    assert result.input_tokens == 1200
    assert result.cached_input_tokens == 0
    assert result.cache_write_input_tokens == 0
    assert result.output_tokens == 160
    assert result.reasoning_tokens == 80
    assert result.reasoning_tokens <= result.output_tokens


@pytest.mark.asyncio
async def test_returns_usage_envelope_without_validating_malformed_metadata() -> None:
    response = make_complete_metadata_response(output={'title': 7})
    generator = OpenAIPublishingMetadataGenerator(FakeResponsesClient(response=response))
    result = await generator.generate(make_metadata_request())
    assert result.provider_response_id == 'resp_metadata_1'
    assert result.input_tokens == 1200
    assert result.output == {'title': 7}


@pytest.mark.asyncio
async def test_returns_costed_refusal_for_application_to_record_first() -> None:
    response = make_complete_metadata_response(output=None, refusal='policy refusal')
    generator = OpenAIPublishingMetadataGenerator(FakeResponsesClient(response=response))
    result = await generator.generate(make_metadata_request())
    assert result.provider_response_id == 'resp_metadata_1'
    assert result.refusal == 'policy refusal'
    assert result.output_tokens == 160


@pytest.mark.asyncio
async def test_gpt_5_5_is_explicit_and_omits_unsupported_cache_options() -> None:
    client = FakeResponsesClient(response=make_complete_metadata_response(model='gpt-5.5'))
    generator = OpenAIPublishingMetadataGenerator(client)
    await generator.generate(make_metadata_request(model_id='gpt-5.5'))
    assert client.requests[0]['model'] == 'gpt-5.5'
    assert 'prompt_cache_options' not in client.requests[0]
    assert 'prompt_cache_breakpoint' not in json.dumps(client.requests[0])
```

Append this parameterized adapter test:

```python
@pytest.mark.parametrize(
    ('response', 'error_type'),
    [
        (make_metadata_response(usage=None), MetadataUsageMissingError),
        (PreSendConnectError('connection not established'), MetadataPreSendError),
        (ResponseReadTimeoutAfterDispatch('response unknown'), PaidCallUncertainError),
    ],
)
@pytest.mark.asyncio
async def test_maps_validation_and_transport_outcomes(response, error_type) -> None:
    client = FakeResponsesClient(response=response)
    generator = OpenAIPublishingMetadataGenerator(client)
    with pytest.raises(error_type):
        await generator.generate(make_metadata_request())
```

Keep the success assertion for provider response ID `resp_metadata_1`. Run the file and expect RED because adapter/client DTO/converter do not exist; implement the typed mappings, then expect GREEN.

- [ ] **GREEN 2.5 — Implement adapter-local Structured Output conversion.**

The OpenAI adapter imports SDK types only under `adapters/youtube`, sends the exact selected model/reasoning with no substitution, and uses schema name `youtube_publishing_metadata_v1` with the strict JSON schema. It reads `promptCachePolicy` from the Phase 1 catalog snapshot: `EXPLICIT_DISABLED` adds `prompt_cache_options={'mode': 'explicit'}` and no breakpoints for GPT-5.6; `LEGACY_AUTOMATIC_NO_WRITE_FEE` omits unsupported options for GPT-5.5. A connection failure proven to occur before request bytes are written maps to `MetadataPreSendError`; a read timeout, connection loss, cancellation, or generic timeout after dispatch maps to nonretryable `PaidCallUncertainError`. Never log prompt, transcript, response body, or API key.

Split provider-envelope extraction from metadata validation. `OpenAIMetadataResponseEnvelopeClientDto.from_response_envelope` extracts only response ID, complete usage categories, refusal, and raw output; it must not instantiate `PublishingMetadataEntityDto` or reject field bounds/types. `openai_metadata_envelope_client_to_entity` then returns `PublishingMetadataProviderResponse`. Missing response ID or usage is a typed adapter error because exact attribution is impossible. A costed refusal or malformed/missing metadata output is returned with its response ID and usage; `MetadataGenerationService` records usage first, then raises the typed refusal/schema error. This rule is tested against the real adapter fake client, not only the application fake.

```python
request_options: dict[str, object] = {
    'model': request.model_id,
    'reasoning': {'effort': request.reasoning_level},
    'max_output_tokens': request.max_generated_tokens,
    'input': build_metadata_prompt(request),
    'store': False,
    'text': {
        'format': {
            'type': 'json_schema',
            'name': 'youtube_publishing_metadata_v1',
            'strict': True,
            'schema': YOUTUBE_PUBLISHING_METADATA_SCHEMA,
        }
    },
}
if request.prompt_cache_policy == PromptCachePolicy.EXPLICIT_DISABLED:
    request_options['prompt_cache_options'] = {'mode': 'explicit'}
response = await self._client.responses.create(**request_options)
envelope = OpenAIMetadataResponseEnvelopeClientDto.from_response_envelope(response)
return openai_metadata_envelope_client_to_entity(envelope)
```

For actual cost, pass `usage.output_tokens` to the Phase 1 calculator exactly once. `usage.output_tokens_details.reasoning_tokens` is retained only as diagnostic detail already included in `usage.output_tokens`:

```python
usage = MetadataUsage(
    input_tokens=envelope.usage.input_tokens,
    cached_input_tokens=envelope.usage.cached_input_tokens,
    cache_write_input_tokens=envelope.usage.cache_write_input_tokens,
    output_tokens=envelope.usage.output_tokens,
    reasoning_tokens=envelope.usage.output_tokens_details.reasoning_tokens,
)
categories = self._cost_calculator.normalize_provider_usage(
    total_input_tokens=usage.input_tokens,
    cached_input_tokens=usage.cached_input_tokens,
    cache_write_input_tokens=usage.cache_write_input_tokens,
    output_tokens=usage.output_tokens,
)
cost = self._cost_calculator.price(
    categories,
    self._catalog.get_pricing(request.model_id, self._pricing_version),
)
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_openai_metadata_generator.py -q
```

Expected GREEN: PASS.

- [ ] **RED 2.6 — Test the concrete authenticated callback adapter.**

Create `test_metadata_callback_http_adapter.py` with an HTTPX mock transport. Assert `record_before_output_validation` posts the generated closed usage body to `/api/internal/v1/youtube/metadata-generations/usage` with `Authorization: Bearer sentinel-worker` and `Idempotency-Key: <callId>`; the JSON includes every usage category, owner ID, purpose, model/reasoning, versions, response ID, and request hash, but no prompt, transcript, provider output, or credential. Assert a lost first response followed by `204` retries the identical body and never invokes a generator. Assert `409 PAID_CALL_CONFLICT` becomes a nonretryable typed error. Also assert `report` posts the generated success/uncertainty union to `/api/internal/v1/youtube/metadata-generations/results` with worker auth.

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_metadata_callback_http_adapter.py -q
```

Expected RED: the port fake collects, but the concrete authenticated adapter module is missing.

- [ ] **GREEN 2.7 — Implement and wire the callback adapter.**

`AuthenticatedMetadataCallbackHttpAdapter` implements both worker ports. It converts application Entities to generated contracts, uses the Phase 1 internal-service bearer credential, fixed internal paths, JSON content type, bounded timeouts, and at most three local retries of the exact same serialized callback on a transport failure/5xx. Local callback retry never re-enters `PublishingMetadataGenerator.generate`; exhaustion is surfaced to the already-dispatched activity as a nonretryable callback outcome so the workflow cannot repeat the paid call. It accepts only `204`, maps `409 PAID_CALL_CONFLICT` without retry, sanitizes every other response without reading/logging its body, and never accepts a per-call URL or header override.

In `composition/worker_container.py`, construct one adapter from the shared redacted internal HTTP client, fixed web base URL, and `settings.internal_worker_credential`; inject it as `MetadataUsageRecorder` into `MetadataGenerationService` and as `MetadataResultReporter` into the metadata activity. Neither the credential nor the adapter is placed in a Temporal payload. The activity calls the usage method immediately after the OpenAI envelope returns and calls the result method only after local validation, or with `PAID_CALL_UNCERTAIN` on an ambiguous post-dispatch outcome.

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_metadata_callback_http_adapter.py tests/application/youtube_publishing/test_metadata_generation_service.py -q
```

Expected GREEN: exact authenticated callbacks pass, and lost acknowledgements replay only the callback.

- [ ] **REFACTOR 2.8 — Keep client and application models distinct.**

Append this architecture fixture to `apps/worker/tests/architecture/test_youtube_import_boundaries.py`:

```python
@pytest.mark.parametrize(
    'forbidden_import',
    ['from openai.types import Response',
     'from clip_factory.adapters.youtube.openai_client_dto import OpenAIMetadataResponseEnvelopeClientDto'],
)
def test_worker_application_rejects_openai_client_types(forbidden_import: str, tmp_path) -> None:
    module = write_worker_fixture(
        tmp_path,
        'clip_factory/application/youtube_publishing/leak.py',
        forbidden_import,
    )
    result = run_import_linter(module)
    assert result.returncode == 1
    assert 'application must not import provider client types' in result.stderr
```

Witness RED if either fixture passes, update `apps/worker/.importlinter`, then rerun worker tests/import-linter; expected GREEN is both fixtures rejected.

## RED-GREEN-REFACTOR cycle 3: deterministic workflow, exact usage event, and atomic completion

- [ ] **RED 3.1 — Write workflow/result callback tests first.**

The Temporal test must assert one generation activity, no retry after provider transmission, safe retry only before request dispatch, canonical `PAID_CALL_UNCERTAIN` after an ambiguous post-transmission timeout/crash, and a token-free result. The web callback test must use this exact result:

```ts
const result = {
  contractVersion: 1,
  draftId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb72',
  expectedRevision: 1,
  providerResponseId: 'resp_metadata_1',
  metadata: makePublishingMetadataApi(),
};

const usage = {
    contractVersion: 1,
    projectId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb70',
    clipId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb71',
    draftId: result.draftId,
    callId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb75',
    requestHash: 'a'.repeat(64),
    providerResponseId: result.providerResponseId,
    purpose: 'YOUTUBE_METADATA_GENERATION',
    modelId: 'gpt-5.6-sol',
    reasoningLevel: 'high',
    promptVersion: 'youtube-metadata-v1',
    schemaVersion: 'youtube-publishing-metadata-v1',
    pricingVersion: 'openai-2026-07-11.1',
    inputTokens: 1200,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 160,
    reasoningTokens: 80,
};

it('records usage before the validated result completes the matching draft', async () => {
  await controller.acceptUsage(usage);
  await controller.acceptResult(result);
  expect(operationOrder).toEqual(['usage-committed', 'output-result-accepted']);
  expect(aiUsageEvents.create).toHaveBeenCalledWith(expect.objectContaining({
    providerResponseId: 'resp_metadata_1',
    purpose: 'YOUTUBE_METADATA_GENERATION',
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    costMicrousd: 12_345n,
    analysisRunId: null,
  }));
  expect(drafts.completeGeneration).toHaveBeenCalledWith(expect.objectContaining({
    draftId: result.draftId,
    expectedRevision: result.expectedRevision,
    state: 'AWAITING_APPROVAL',
    aiUsageEventId: expect.any(String),
    actualCostMicrousd: 12_345n,
  }));
  expect(aiUsageEvents.create).toHaveBeenCalledOnce();
});

it('records an ambiguous post-transmission outcome without completing or retrying the draft', async () => {
  await controller.acceptResult({
    contractVersion: 1,
    draftId: result.draftId,
    state: 'PAID_CALL_UNCERTAIN',
    possibleSpendMicrousd: '50000',
    safeReasonCode: 'OPENAI_RESULT_UNKNOWN_AFTER_TRANSMISSION',
  });
  expect(paidCallReservations.markUncertain).toHaveBeenCalledWith(expect.objectContaining({
    possibleSpendMicrousd: 50_000n,
  }));
  expect(drafts.completeGeneration).not.toHaveBeenCalled();
  expect(aiUsageEvents.create).not.toHaveBeenCalled();
  expect(metadataWorkflowScheduler.start).not.toHaveBeenCalled();
});

it('rejects a conflicting usage replay without another event or project charge', async () => {
  await controller.acceptUsage(usage);

  await expect(controller.acceptUsage({
    ...usage,
    requestHash: 'b'.repeat(64),
  })).rejects.toMatchObject({ code: 'PAID_CALL_CONFLICT' });
  await expect(controller.acceptUsage({
    ...usage,
    inputTokens: usage.inputTokens + 1,
  })).rejects.toMatchObject({ code: 'PAID_CALL_CONFLICT' });

  expect(aiUsageEvents.create).toHaveBeenCalledOnce();
  expect(projects.addOpenAISpend).toHaveBeenCalledOnce();
  expect(paidCallReservations.complete).toHaveBeenCalledOnce();
});
```

Create the real-adapter integration file with guaranteed teardown:

```ts
import { afterEach, expect, it } from 'vitest';

import {
  MetadataGenerationHarness,
} from './support/metadata-generation-harness';

let harness: MetadataGenerationHarness | undefined;

afterEach(async () => {
  await harness?.stop();
  harness = undefined;
});

it('persists exact usage once before malformed provider output is rejected', async () => {
  harness = await MetadataGenerationHarness.start();
  const seeded = await harness.seedManualClipWithoutAnalysisRun();
  harness.openAI.enqueueResponse({
    id: 'resp_malformed_metadata_1',
    output: { title: 7 },
    usage: {
      input_tokens: 1200,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      output_tokens: 160,
      output_tokens_details: { reasoning_tokens: 80 },
    },
  });

  const started = await harness.startConfirmedGeneration(seeded, {
    idempotencyKey: 'metadata-malformed-1',
  });
  await harness.waitForGenerationFailure(started.workflowId, 'METADATA_SCHEMA_INVALID');

  expect(await harness.usageEventsByProviderResponse('resp_malformed_metadata_1'))
    .toEqual([expect.objectContaining({
      projectId: seeded.projectId,
      clipId: seeded.clipId,
      analysisRunId: null,
      inputTokens: 1200,
      outputTokens: 160,
      reasoningTokens: 80,
    })]);
  expect(await harness.projectSpend(seeded.projectId)).toBeGreaterThan(0n);
  expect(await harness.requireDraft(started.draftId)).toMatchObject({
    state: 'METADATA_DRAFT',
    aiUsageEventId: null,
  });
  expect(harness.openAI.requestCount).toBe(1);

  await harness.replayCapturedUsageCallback();
  expect(await harness.usageEventsByProviderResponse('resp_malformed_metadata_1'))
    .toHaveLength(1);
  expect(harness.openAI.requestCount).toBe(1);
});
```

`metadata-generation-harness.ts` implements the shown class against the Phase 1 disposable `TestEnvironment`: `start()` starts a loopback fake Responses server, then the migrated web/worker/Temporal stack with `OPENAI_BASE_URL` pointed at it and fake internal worker credentials; `seedManualClipWithoutAnalysisRun()` writes only through Phase 1/Task 4 test seeding APIs; query methods use the integration Prisma client; and `stop()` shuts down worker/web/fake server before `TestEnvironment.stop()` removes workflows, objects, Redis keys, database, and Compose volumes in `finally`. Extend `test-environment.ts` with these typed start/stop hooks instead of spawning ad hoc processes. Create all public shells first so the test collects; the intended RED is `usageEventsByProviderResponse(...)` returning `[]`, never `ENOENT` or import failure.

- [ ] **RED 3.2 — Run and witness missing workflow/result support.**

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py -q
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
pnpm exec vitest run tests/integration/youtube-publishing/metadata-generation.test.ts
```

Expected RED: workflow/usage/result shells collect; the provider response reaches output validation before `acceptUsage`, violating the asserted `usage-committed` then `output-result-accepted` order.

- [ ] **GREEN 3.3 — Extend contract and implement atomic result handling.**

Add closed `metadataGenerationUsageV1` (the `usage` fixture above, without provider output/body) and `metadataGenerationResultV1`: either `{ contractVersion: 1, draftId, expectedRevision, providerResponseId, metadata }`, or `{ contractVersion: 1, draftId, state: 'PAID_CALL_UNCERTAIN', possibleSpendMicrousd, safeReasonCode: 'OPENAI_RESULT_UNKNOWN_AFTER_TRANSMISSION' }`. Neither contract accepts credential/provider-body fields. Regenerate both runtimes.

Create the Phase 2 usage-scope migration so both the reservation and its eventual usage event can belong to a manual-origin clip without inventing an `AnalysisRun`. Backfill existing Phase 1 reservations before adding `NOT NULL`; `PHASE_1_ANALYSIS` is a migration-only umbrella for an incomplete legacy reservation whose exact `HIGHLIGHT_WINDOW`/`GLOBAL_RANKING` purpose is not yet present on a usage event. Every new reservation carries its exact purpose.

```sql
alter table "ai_usage_events"
  alter column "analysis_run_id" drop not null;

alter table "ai_usage_events"
  drop constraint "ai_usage_events_analysis_run_id_fkey",
  add constraint "ai_usage_events_analysis_run_id_fkey"
    foreign key ("analysis_run_id") references "analysis_runs" ("id") on delete cascade,
  add constraint "ai_usage_events_scope_check" check (
    ("purpose" = 'YOUTUBE_METADATA_GENERATION' and
      "analysis_run_id" is null and "clip_id" is not null) or
    ("purpose" <> 'YOUTUBE_METADATA_GENERATION' and "analysis_run_id" is not null)
  );

create index "ai_usage_events_project_clip_occurred_idx"
  on "ai_usage_events" ("project_id", "clip_id", "occurred_at" desc)
  where "purpose" = 'YOUTUBE_METADATA_GENERATION';

alter table "paid_call_reservations"
  add column "project_id" uuid,
  add column "clip_id" uuid,
  add column "purpose" varchar(100);

update "paid_call_reservations" as reservation
set
  "project_id" = analysis_run."project_id",
  "purpose" = coalesce(
    (
      select usage_event."purpose"
      from "ai_usage_events" as usage_event
      where usage_event."id" = reservation."usage_event_id"
    ),
    'PHASE_1_ANALYSIS'
  )
from "analysis_runs" as analysis_run
where analysis_run."id" = reservation."analysis_run_id";

alter table "paid_call_reservations"
  alter column "project_id" set not null,
  alter column "purpose" set not null,
  alter column "analysis_run_id" drop not null,
  drop constraint "paid_call_reservations_analysis_run_id_fkey",
  add constraint "paid_call_reservations_analysis_run_id_fkey"
    foreign key ("analysis_run_id") references "analysis_runs" ("id") on delete cascade,
  add constraint "paid_call_reservations_project_id_fkey"
    foreign key ("project_id") references "projects" ("id") on delete cascade,
  add constraint "paid_call_reservations_clip_id_fkey"
    foreign key ("clip_id") references "clips" ("id") on delete restrict,
  add constraint "paid_call_reservations_scope_check" check (
    ("purpose" = 'YOUTUBE_METADATA_GENERATION' and
      "analysis_run_id" is null and "clip_id" is not null) or
    ("purpose" <> 'YOUTUBE_METADATA_GENERATION' and "analysis_run_id" is not null)
  );

create index "paid_call_reservations_metadata_scope_idx"
  on "paid_call_reservations" ("project_id", "clip_id", "purpose", "status")
  where "purpose" = 'YOUTUBE_METADATA_GENERATION';
```

For `AIUsageEvent`, make `analysisRunId String?` and `analysisRun AnalysisRun?`; update Entity/Record/converter/port nullability and direct round-trip tests. For `PaidCallReservation`, add required `projectId`/`project`, optional `clipId`/`clip`, required `purpose`, and make `analysisRunId`/`analysisRun` optional; add the inverse Clip relation. Create its application Entity DTO and explicit Entity↔Record converter, then update the application repository port, data service, Prisma adapter, and composition. Application creation validates project/clip ownership before insert. The Prisma integration test inserts a manual-origin clip with no analysis run, persists a metadata reservation with `analysisRunId: null`, and proves both a missing clip and a metadata reservation with a non-null analysis run fail. It also proves Phase 1 analysis reservations still require a non-null analysis run. Existing analysis usage remains required by its check, while metadata usage sets `analysisRunId: null`, `projectId`, and `clipId`.

Add repository/data-service `completeGeneration` that atomically matches `draftId`, source `OPENAI`, state `METADATA_DRAFT`, and expected revision; it looks up the already committed usage by `providerResponseId`, sets validated fields, `AWAITING_APPROVAL`, actual cost, usage FK, and increments revision. It cannot update an already approved/superseded draft and cannot create usage.

The deterministic workflow calls one activity with the generated input and returns/reports the generated result. The activity performs transcript/Object Store/OpenAI/clock/network work and sends the authenticated usage callback immediately after receiving response ID/usage, before schema validation; only then may it send the validated-result callback. It records `providerRequestDispatched=true` in its durable Phase 1 paid-call attempt before awaiting the provider. An ambiguous timeout/crash after that marker raises a non-retryable `PaidCallUncertainError`; the workflow reports canonical `PAID_CALL_UNCERTAIN` and does not schedule another generator activity. Duplicate usage/result callback keys are idempotent. A received invalid output still leaves one exact immutable usage event and completed reservation; a validation retry requires a distinct reservation/call ID.

```ts
await this.unitOfWork.execute(async (transaction) => {
  const usageInput = metadataUsageApiToEntity(usage);
  const reservation = await this.paidCallReservations.requireByCallIdForUpdate(
    usageInput.callId,
    transaction,
  );
  if (
    reservation.requestHash !== usageInput.requestHash ||
    reservation.projectId !== usageInput.projectId ||
    reservation.clipId !== usageInput.clipId ||
    reservation.analysisRunId !== null ||
    reservation.purpose !== 'YOUTUBE_METADATA_GENERATION'
  ) {
    throw new PaidCallConflictError();
  }
  if (
    reservation.providerResponseId !== null &&
    reservation.providerResponseId !== usageInput.providerResponseId
  ) {
    throw new PaidCallConflictError();
  }
  const tokenCategories = normalizeProviderUsage(
    usageInput.inputTokens,
    usageInput.cachedInputTokens,
    usageInput.cacheWriteInputTokens,
    usageInput.outputTokens,
  );
  const pricing = this.catalog.getPricing(
    usageInput.modelId,
    usageInput.pricingVersion,
  );
  const costMicrousd = priceTokens(tokenCategories, pricing);
  const candidate = metadataUsageToAIUsageEventCandidate(usageInput, {
    analysisRunId: null,
    costMicrousd,
    pricingTier: pricing.tier,
    occurredAt: this.clock.now(),
  });
  const existing = await this.aiUsageEvents.findByProviderResponseId(
    usageInput.providerResponseId,
    transaction,
  );
  if (existing) {
    if (
      reservation.status !== 'COMPLETED' ||
      reservation.providerResponseId !== existing.providerResponseId ||
      reservation.usageEventId !== existing.id ||
      !sameMetadataUsageEvent(existing, candidate)
    ) {
      throw new PaidCallConflictError();
    }
    return existing;
  }
  if (reservation.status !== 'SENT' || reservation.usageEventId !== null) {
    throw new PaidCallConflictError();
  }
  const event = await this.aiUsageEvents.create(candidate, transaction);
  await this.paidCallReservations.complete(
    {
      callId: usageInput.callId,
      requestHash: usageInput.requestHash,
      providerResponseId: usageInput.providerResponseId,
      usageEventId: event.id,
    },
    transaction,
  );
  await this.projects.addOpenAISpend(event.projectId, event.costMicrousd, transaction);
  return event;
});

await this.unitOfWork.execute(async (transaction) => {
  const usageEvent = await this.aiUsageEvents.requireByProviderResponseId(
    result.providerResponseId,
    transaction,
  );
  return this.drafts.completeGeneration(
    {
      draftId: parsePublishingMetadataDraftId(result.draftId),
      expectedRevision: result.expectedRevision,
      metadata: publishingMetadataApiToEntity(result.metadata),
      aiUsageEventId: usageEvent.id,
      actualCostMicrousd: usageEvent.costMicrousd,
    },
    transaction,
  );
});
```

`requireByCallIdForUpdate` locks the reservation row so concurrent identical callbacks serialize; the unique provider-response constraint remains the final database guard. `metadataUsageToAIUsageEventCandidate` explicitly drops transport-only `draftId`, `callId`, and `requestHash`. `sameMetadataUsageEvent` compares every immutable persisted usage/cost field—`projectId`, nullable `analysisRunId`, `clipId`, `providerResponseId`, `purpose`, `modelId`, `reasoning`, `promptVersion`, `schemaVersion`, `pricingVersion`, `inputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`, `outputTokens`, `reasoningTokens`, `pricingTier`, and `costMicrousd`—without JSON-stringifying bigint. The request hash remains authoritative on the reservation. Thus the same provider response under another call, a changed hash, changed token category, changed price result, or changed owner returns `PAID_CALL_CONFLICT` before insert/spend; only a semantic replay of the completed call returns the existing event.

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py -q
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
pnpm test:contracts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Preserve paid-call idempotency across retry/restart.**

Append these Temporal tests:

```python
@pytest.mark.asyncio
async def test_complete_response_survives_lost_callback_ack_without_second_paid_call() -> None:
    harness = await MetadataWorkflowHarness.start(callback_ack_failures=1)
    result = await harness.run(make_metadata_workflow_input())
    assert result.state == 'AWAITING_APPROVAL'
    assert harness.responses.call_count == 1
    assert harness.postgres.usage_event_count == 1
    assert harness.postgres.completed_draft_count == 1


@pytest.mark.asyncio
async def test_worker_loss_after_send_enters_paid_call_uncertain_without_retry() -> None:
    harness = await MetadataWorkflowHarness.start(crash_after_request_dispatched=True)
    handle = await harness.start(make_metadata_workflow_input())
    await harness.restart_worker()
    await harness.wait_for_state('PAID_CALL_UNCERTAIN')
    assert harness.responses.call_count == 1
    assert harness.postgres.completed_draft_count == 0
    assert harness.scheduler.automatic_retry_count == 0
    await harness.authorize_fresh_attempt(
        acknowledge_possible_prior_spend=True,
        idempotency_key='metadata:clip-1:fresh-2',
    )
    assert harness.reservations.count == 2
    assert harness.responses.call_count == 2
```

Witness RED on automatic activity retry or missing durable result/uncertainty state, implement the Phase 1 reservation/reconciliation rules, and rerun workflow/integration tests; expected GREEN is PASS.

## RED-GREEN-REFACTOR cycle 4: estimate/start/internal route contracts

- [ ] **RED 4.1 — Write HTTP contract tests.**

Test that estimate returns model/reasoning/pricing version/estimate/reserved worst case without spending; start requires `Idempotency-Key`, exact confirmed estimate, cap, and explicit `confirmed: true`; both internal usage and result routes require worker auth before DTO parsing; extra fields and cost as floating point return 400.

Use this exact assertion:

```ts
await testApi.post(`/api/v1/clips/${clipId}/youtube/metadata-generations`)
  .set('Idempotency-Key', 'metadata:clip-1:request-1')
  .send({
    modelId: 'gpt-5.6-sol',
    reasoningLevel: 'high',
    maximumCostMicrousd: '50000',
    confirmedEstimateMicrousd: '30000',
    instruction: null,
    confirmed: false,
    priorUncertainAttemptId: null,
    possiblePriorSpendAcknowledged: false,
  })
  .expect(400, expect.objectContaining({ code: 'EXPLICIT_CONFIRMATION_REQUIRED' }));
```

- [ ] **RED 4.2 — Witness missing routes/validation.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
```

Expected RED: registered route shells collect and return `501 NOT_IMPLEMENTED`; the `confirmed: false` request does not yet return `400 EXPLICIT_CONFIRMATION_REQUIRED`. A route `404` is not accepted.

- [ ] **GREEN 4.3 — Implement closed API DTOs and thin handlers.**

API-to-Entity converter parses decimal strings to bigint, never float. Estimate route invokes `estimate`; start route verifies `confirmed === true`, passes the request ID/idempotency key to one service method, returns `202`. Both internal routes authenticate before parsing: usage validates `metadataGenerationUsageV1` and invokes `acceptUsage`, while result validates `metadataGenerationResultV1` and invokes `acceptResult`. No route computes price or calls OpenAI/Temporal directly.

```ts
async start(request: AuthenticatedRequest): Promise<ApiResponse> {
  const body = startMetadataGenerationSchema.parse(request.body);
  if (!body.confirmed) throw new ExplicitConfirmationRequiredError();
  const idempotencyKey = requireIdempotencyKey(request.headers);
  const result = await this.service.start({
    ...generateMetadataApiToEntity(body),
    idempotencyKey,
  });
  return { status: 202, body: metadataGenerationStartEntityToApi(result) };
}

async acceptResult(request: WorkerAuthenticatedRequest): Promise<ApiResponse> {
  const result = parseMetadataGenerationResultV1(request.body);
  await this.service.acceptResult(metadataGenerationResultContractToEntity(result));
  return { status: 204, body: null };
}

async acceptUsage(request: WorkerAuthenticatedRequest): Promise<ApiResponse> {
  const usage = parseMetadataGenerationUsageV1(request.body);
  await this.service.acceptUsage(metadataGenerationUsageContractToEntity(usage));
  return { status: 204, body: null };
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.4 — Test boundary loss risks.**

Append this converter table:

```ts
it.each([
  ['9007199254740991', 9_007_199_254_740_991n],
  ['9007199254740992', 9_007_199_254_740_992n],
] as const)('parses decimal micro-USD %s without Number conversion', (value, expected) => {
  expect(generateMetadataApiToEntity(makeGenerateApi({ maximumCostMicrousd: value })))
    .toMatchObject({ maxCostMicrousd: expected });
});

it.each(['1.5', '-1', 'NaN', ''])('rejects invalid decimal micro-USD %s', (value) => {
  expect(() => generateMetadataApiToEntity(makeGenerateApi({ maximumCostMicrousd: value })))
    .toThrow('maximumCostMicrousd must be a nonnegative integer string');
});

it('rejects missing usage categories and unknown purpose', () => {
  expect(() => metadataResultApiToEntity(makeMetadataResultApi({ outputTokens: undefined })))
    .toThrow('complete usage categories are required');
  expect(() => metadataResultApiToEntity(makeMetadataResultApi({ purpose: 'HIGHLIGHT_ANALYSIS' })))
    .toThrow('metadata result purpose must be YOUTUBE_METADATA_GENERATION');
});
```

Include Unicode title/description in the valid fixture, run converter/HTTP tests and architecture check, and expect PASS.

## Broader verification

- [ ] Run:

```bash
pnpm test:contracts
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/generate-publishing-metadata.service.test.ts src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
uv run --directory apps/worker pytest tests/application/youtube_publishing/test_metadata_generation_service.py tests/adapters/youtube/test_openai_metadata_generator.py tests/adapters/youtube/test_metadata_callback_http_adapter.py tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py -q
pnpm exec vitest run tests/integration/youtube-publishing/metadata-generation.test.ts
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm manual metadata edits execute no scheduler/generator call and persist exactly zero OpenAI cost.

```bash
pnpm exec vitest run tests/integration/youtube-publishing/metadata-generation.test.ts -t 'manual metadata edit records zero OpenAI cost'
```

- [ ] Confirm OpenAI receives transcript text/project context/instruction only—no media/object bytes/local paths/credentials.

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_openai_metadata_generator.py tests/application/youtube_publishing/test_metadata_generation_service.py -q -k 'transcript_only or no_media or no_credentials'
```

- [ ] Confirm a callback retry or worker restart never creates a second paid call, usage event, or draft version.

```bash
pnpm exec vitest run tests/integration/youtube-publishing/metadata-generation.test.ts -t 'callback retry or worker restart is idempotent'
```

## Review gate

Approve only when estimate/cap confirmation is witnessed before the call, exact pre-call pricing gates the real prompt, one generated version/usage event survives restart idempotently, old drafts remain unchanged, and OpenAI SDK/client DTOs remain adapter-only.

## Suggested commit

```text
feat(youtube): generate metadata with separate cost provenance
```
