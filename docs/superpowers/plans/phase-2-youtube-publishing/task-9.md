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

- Modify: `packages/contracts/schema/youtube-publishing.schema.json`
- Regenerate: `packages/contracts/src/generated/youtube-publishing.ts`
- Regenerate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/youtube_publishing.py`
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
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts`
- Create: `apps/worker/src/clip_factory/application/youtube_publishing/metadata_generation_service.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/publishing_metadata_generator.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/openai_metadata_generator.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/openai_client_dto.py`
- Create: `apps/worker/src/clip_factory/converters/youtube_publishing/client_entity/openai_metadata.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/metadata_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/metadata_activities.py`
- Create: `apps/worker/tests/application/youtube_publishing/test_metadata_generation_service.py`
- Create: `apps/worker/tests/adapters/youtube/test_openai_metadata_generator.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py`
- Create: `tests/integration/youtube-publishing/metadata-generation.test.ts`
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
class GeneratedPublishingMetadata:
    provider_response_id: str
    title: str
    description: str
    hashtags: tuple[str, ...]
    keyword_tags: tuple[str, ...]
    category_id: str
    default_language: str
    made_for_kids: bool
    contains_synthetic_media: bool
    input_tokens: int
    cached_input_tokens: int
    cache_write_input_tokens: int
    output_tokens: int
    reasoning_tokens: int


class PublishingMetadataGenerator(Protocol):
    async def generate(
        self,
        request: MetadataGenerationRequest,
    ) -> GeneratedPublishingMetadata:
        raise NotImplementedError
```

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
    transcriptObjectKey: 'transcripts/project-1/v1.json',
    modelId: 'gpt-5.6-sol',
    reasoningLevel: 'high',
    maxCostMicrousd: '50000',
  }));
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

The service loads the Phase 1 clip/project/transcript reference through narrow read ports, validates the exact selected model/reasoning against the Phase 1 catalog, and requires that model's Phase 1 access projection to be `AVAILABLE` before any reservation. `NOT_ENTITLED`, `NOT_FOUND`, and `CHECK_UNAVAILABLE` become distinct safe blocking errors; none selects another model. It derives the prompt ceiling and the selected profile's single `maxGeneratedTokens` cap, calls the Phase 1 decimal-safe cost calculator, and compares both the displayed estimate and `1.5 * worstCase`. The one generated-token cap includes reasoning, visible output, and formatting; never add a separate reasoning ceiling or reserve. It durably creates a new Phase 1 paid-call reservation before scheduling, then creates a new draft ID/version with source `OPENAI`, state `METADATA_DRAFT`, empty editable fields, selected provenance, exact estimate/cap, and zero actual cost inside the existing Phase 1 unit-of-work/idempotency receipt. It schedules the token-free Task 1 payload only after reservation commit. If scheduling fails before provider transmission, it records a sanitized job failure and releases according to the Phase 1 reservation policy without deleting older drafts. A request following `PAID_CALL_UNCERTAIN` must use a new idempotency key/reservation and `possiblePriorSpendAcknowledged: true`; it never reuses or clears the uncertain reservation.

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
    assert fakes.object_store.read_keys == ['transcripts/project-1/v1.json']
    assert fakes.object_store.media_reads == []
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

Only after that check calls `PublishingMetadataGenerator.generate`. Validate output with the metadata policy equivalent: title 100 code points, description 5000 UTF-8 bytes, at most eight relevant no-space hashtags, keyword accounting at most 500, category/language/audience booleans. Provider output never selects visibility/schedule.

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
        (make_metadata_response(output={'title': 7}), MetadataSchemaError),
        (make_metadata_response(usage=None), MetadataUsageMissingError),
        (make_metadata_response(refusal='policy refusal'), MetadataRefusalError),
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

The OpenAI adapter imports SDK types only under `adapters/youtube`, sends the exact selected model/reasoning with no substitution, uses schema name `youtube_publishing_metadata_v1` and strict JSON fields from `PublishingMetadataEntityDto`, parses a complete client DTO, and converts through `client_entity/openai_metadata.py`. It reads `promptCachePolicy` from the Phase 1 catalog snapshot: `EXPLICIT_DISABLED` adds `prompt_cache_options={'mode': 'explicit'}` and no breakpoints for GPT-5.6; `LEGACY_AUTOMATIC_NO_WRITE_FEE` omits unsupported options for GPT-5.5. A connection failure proven to occur before request bytes are written maps to `MetadataPreSendError`; a read timeout, connection loss, cancellation, or generic timeout after dispatch maps to nonretryable `PaidCallUncertainError`. Map refusal/schema failure to typed sanitized adapter errors. Never log prompt, transcript, response body, or API key.

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
client_dto = OpenAIMetadataResponseClientDto.from_response(response)
return openai_metadata_client_to_entity(client_dto)
```

For actual cost, pass `usage.output_tokens` to the Phase 1 calculator exactly once. `usage.output_tokens_details.reasoning_tokens` is retained only as diagnostic detail already included in `usage.output_tokens`:

```python
usage = MetadataUsage(
    input_tokens=client_dto.usage.input_tokens,
    cached_input_tokens=client_dto.usage.cached_input_tokens,
    cache_write_input_tokens=client_dto.usage.cache_write_input_tokens,
    output_tokens=client_dto.usage.output_tokens,
    reasoning_tokens=client_dto.usage.output_tokens_details.reasoning_tokens,
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

- [ ] **REFACTOR 2.6 — Keep client and application models distinct.**

Append this architecture fixture to `apps/worker/tests/architecture/test_youtube_import_boundaries.py`:

```python
@pytest.mark.parametrize(
    'forbidden_import',
    ['from openai.types import Response',
     'from clip_factory.adapters.youtube.openai_client_dto import OpenAIMetadataResponseClientDto'],
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
  metadata: makePublishingMetadataApi(),
  usage: {
    providerResponseId: 'resp_metadata_1',
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
    costMicrousd: '12345',
  },
};

it('atomically stores usage and completes the matching draft', async () => {
  await controller.acceptResult(result);
  expect(unitOfWork.execute).toHaveBeenCalledOnce();
  expect(aiUsageEvents.create).toHaveBeenCalledWith(expect.objectContaining({
    providerResponseId: 'resp_metadata_1',
    purpose: 'YOUTUBE_METADATA_GENERATION',
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    costMicrousd: 12_345n,
  }));
  expect(drafts.completeGeneration).toHaveBeenCalledWith(expect.objectContaining({
    draftId: result.draftId,
    expectedRevision: result.expectedRevision,
    state: 'AWAITING_APPROVAL',
    aiUsageEventId: expect.any(String),
    actualCostMicrousd: 12_345n,
  }));
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
```

- [ ] **RED 3.2 — Run and witness missing workflow/result support.**

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py -q
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/publishing-metadata-generation.controller.test.ts
```

Expected RED: workflow/result shells collect; the success callback creates no `AIUsageEvent` and leaves the draft in `METADATA_DRAFT` instead of `AWAITING_APPROVAL`.

- [ ] **GREEN 3.3 — Extend contract and implement atomic result handling.**

Add `metadataGenerationResultV1` to Task 1's schema as a closed `oneOf`: the successful result above, or `{ contractVersion: 1, draftId, state: 'PAID_CALL_UNCERTAIN', possibleSpendMicrousd, safeReasonCode: 'OPENAI_RESULT_UNKNOWN_AFTER_TRANSMISSION' }`. Neither branch accepts credential/provider-body fields. Regenerate both runtimes.

Add repository/data-service `completeGeneration` that atomically matches `draftId`, source `OPENAI`, state `METADATA_DRAFT`, and expected revision; it sets validated fields, `AWAITING_APPROVAL`, actual cost, usage FK, and increments revision. It cannot update an already approved/superseded draft.

The deterministic workflow calls one activity with the generated input and returns/reports the generated result. The activity performs transcript/Object Store/OpenAI/clock/network work and sends the authenticated internal callback. It records `providerRequestDispatched=true` in its durable Phase 1 paid-call attempt before awaiting the provider. An ambiguous timeout/crash after that marker raises a non-retryable `PaidCallUncertainError`; the workflow reports canonical `PAID_CALL_UNCERTAIN` and does not schedule another generator activity. The web service uses the Phase 1 unit-of-work to create immutable `AIUsageEvent` and complete the draft only on a received, validated result; duplicate `providerResponseId` or callback idempotency key returns the existing result without duplicating cost.

```ts
await this.unitOfWork.execute(async (transaction) => {
  const existing = await transaction.aiUsageEvents.findByProviderResponseId(
    result.usage.providerResponseId,
  );
  if (existing) return transaction.drafts.findById(result.draftId);
  const usage = await transaction.aiUsageEvents.create(metadataUsageApiToEntity(result.usage));
  return transaction.drafts.completeGeneration({
    draftId: parsePublishingMetadataDraftId(result.draftId),
    expectedRevision: result.expectedRevision,
    metadata: publishingMetadataApiToEntity(result.metadata),
    aiUsageEventId: usage.id,
    actualCostMicrousd: usage.costMicrousd,
  });
});
```

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

Test that estimate returns model/reasoning/pricing version/estimate/reserved worst case without spending; start requires `Idempotency-Key`, exact confirmed estimate, cap, and explicit `confirmed: true`; internal result requires worker auth; extra fields and cost as floating point return 400.

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

API-to-Entity converter parses decimal strings to bigint, never float. Estimate route invokes `estimate`; start route verifies `confirmed === true`, passes the request ID/idempotency key to one service method, returns `202`; internal callback authenticates then validates generated contract and invokes `acceptResult`. No route computes price or calls OpenAI/Temporal directly.

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
uv run --directory apps/worker pytest tests/application/youtube_publishing/test_metadata_generation_service.py tests/adapters/youtube/test_openai_metadata_generator.py tests/entrypoints/temporal/youtube_publishing/test_metadata_workflow.py -q
pnpm exec vitest run tests/integration/youtube-publishing/metadata-generation.test.ts
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm manual metadata edits execute no scheduler/generator call and persist exactly zero OpenAI cost.
- [ ] Confirm OpenAI receives transcript text/project context/instruction only—no media/object bytes/local paths/credentials.
- [ ] Confirm a callback retry or worker restart never creates a second paid call, usage event, or draft version.

## Review gate

Approve only when estimate/cap confirmation is witnessed before the call, exact pre-call pricing gates the real prompt, one generated version/usage event survives restart idempotently, old drafts remain unchanged, and OpenAI SDK/client DTOs remain adapter-only.

## Suggested commit

```text
feat(youtube): generate metadata with separate cost provenance
```
