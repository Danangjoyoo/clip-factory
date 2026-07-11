# Task 3: Validate Configuration, Secrets, and Versioned Catalogs

> **For agentic workers:** Use superpowers:test-driven-development. Catalog JSON is production behavior and must follow the same witnessed cycle.

## Purpose and traceability

Implement design §§6, 11, 13, 17, 24–25, and 30: one validated server configuration, worker-only OpenAI secret, and authoritative model/reasoning/pricing/platform catalogs.

## Layers and boundaries

- `packages/config` owns nonsecret catalog schemas and pure lookup policy.
- `apps/web` adapter parses server environment; browser bundles receive only explicitly public presentation values.
- `apps/worker` composition parses worker environment; `OPENAI_API_KEY` never enters domain/application or payload models.
- Produces `ModelCatalogEntry`, `PricingRule`, and `PlatformPresetConfig`; these are config types, not Entity DTOs.

## Exact files

- Create: `.env.example`, `packages/config/src/catalog-schema.ts`, `packages/config/src/model-catalog.json`, `packages/config/src/pricing-catalog.json`, `packages/config/src/platform-catalog.json`, `packages/config/src/catalog.ts`, `packages/config/src/catalog.test.ts`
- Create: `apps/web/src/config/server-env.ts`, `apps/web/src/config/server-env.test.ts`
- Create: `apps/worker/src/clip_factory/composition/settings.py`, `apps/worker/tests/composition/test_settings.py`
- Modify: `.gitignore`, `packages/config/src/index.ts`, `packages/config/package.json`, `apps/worker/pyproject.toml`
- Pin `zod` to `4.4.3` and `pydantic` to `2.13.4` without ranges.

## Prerequisites and produced interfaces

- Requires Tasks 1–2.
- Produces `listCompatibleModels()`, `getModel(modelId)`, `supportsReasoning(modelId, reasoning)`, `getPricing(modelId, snapshotVersion)`, `getPlatformPreset(id)`, `loadServerEnv()`, and `WorkerSettings.from_env()`.

## RED → GREEN → REFACTOR

- [ ] **RED: write exact catalog behavior first.**

```ts
// packages/config/src/catalog.test.ts
import { describe, expect, it } from 'vitest';
import { getModel, getPlatformPreset, listCompatibleModels, supportsReasoning } from './catalog';

describe('versioned catalogs', () => {
  it('pins the approved default without silently accepting an unsupported effort', () => {
    expect(getModel('gpt-5.6-sol')).toMatchObject({ defaultReasoning: 'high', catalogVersion: '2026-07-11.1' });
    expect(getModel('gpt-5.6-sol').reasoning.map((item) => item.effort)).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    expect(getModel('gpt-5.5').reasoning.map((item) => item.effort)).toEqual(['none', 'low', 'medium', 'high', 'xhigh']);
    expect(listCompatibleModels().map((item) => item.id)).toEqual(['gpt-5.6-sol', 'gpt-5.5']);
    expect(supportsReasoning('gpt-5.6-sol', 'high')).toBe(true);
    expect(supportsReasoning('gpt-5.5', 'max')).toBe(false);
  });

  it('defines all three safe-area guides on a normalized canvas', () => {
    expect(getPlatformPreset('YOUTUBE_SHORTS').safeArea).toEqual({ top: 0.08, right: 0.06, bottom: 0.2, left: 0.06 });
    expect(getPlatformPreset('INSTAGRAM_REELS').canvas).toEqual({ width: 1080, height: 1920 });
    expect(getPlatformPreset('TIKTOK').canvas).toEqual({ width: 1080, height: 1920 });
  });
});
```

- [ ] First create compile-safe `catalog.ts` exports returning empty/unsupported values and verify `pnpm --filter @clip-factory/config exec tsc --noEmit`; expect PASS. Then run `pnpm --filter @clip-factory/config test -- catalog.test.ts`; expect the named approved-model assertion to FAIL with `[]` instead of the two model IDs.

- [ ] **GREEN: create validated catalogs and lookup functions.** Store this exact default entry in `model-catalog.json`:

```json
{
  "catalogVersion": "2026-07-11.1",
  "models": [
    {
      "id": "gpt-5.6-sol",
      "provider": "OPENAI",
      "reasoning": [
        { "effort": "none", "maxGeneratedTokens": 4096 },
        { "effort": "low", "maxGeneratedTokens": 16384 },
        { "effort": "medium", "maxGeneratedTokens": 24576 },
        { "effort": "high", "maxGeneratedTokens": 32768 },
        { "effort": "xhigh", "maxGeneratedTokens": 49152 },
        { "effort": "max", "maxGeneratedTokens": 65536 }
      ],
      "defaultReasoning": "high",
      "structuredOutputs": true,
      "providerMaxOutputTokens": 128000,
      "availabilityHint": "ENTITLEMENT_REQUIRED",
      "promptCachePolicy": "EXPLICIT_DISABLED",
      "longContextThresholdTokens": 272000
    },
    {
      "id": "gpt-5.5",
      "provider": "OPENAI",
      "reasoning": [
        { "effort": "none", "maxGeneratedTokens": 4096 },
        { "effort": "low", "maxGeneratedTokens": 16384 },
        { "effort": "medium", "maxGeneratedTokens": 24576 },
        { "effort": "high", "maxGeneratedTokens": 32768 },
        { "effort": "xhigh", "maxGeneratedTokens": 49152 }
      ],
      "defaultReasoning": "high",
      "structuredOutputs": true,
      "providerMaxOutputTokens": 128000,
      "availabilityHint": "STANDARD",
      "promptCachePolicy": "LEGACY_AUTOMATIC_NO_WRITE_FEE",
      "longContextThresholdTokens": 272000
    }
  ]
}
```

Create the pricing file with these complete decimal-safe values. Reasoning tokens are included in billed output tokens; there is intentionally no separate reasoning rate.

```json
{
  "catalogVersion": "openai-2026-07-11.1",
  "currency": "USD",
  "unit": "MICRO_USD_PER_MILLION_TOKENS",
  "rules": [
    {
      "modelId": "gpt-5.6-sol",
      "tier": "STANDARD",
      "effectiveFrom": "2026-07-11T00:00:00Z",
      "inputMicrousdPerMillion": 5000000,
      "cachedInputMicrousdPerMillion": 500000,
      "cacheWriteMicrousdPerMillion": 6250000,
      "outputMicrousdPerMillion": 30000000,
      "longContextThresholdTokens": 272000,
      "longContextInputMultiplier": { "numerator": 2, "denominator": 1 },
      "longContextOutputMultiplier": { "numerator": 3, "denominator": 2 }
    },
    {
      "modelId": "gpt-5.5",
      "tier": "STANDARD",
      "effectiveFrom": "2026-07-11T00:00:00Z",
      "inputMicrousdPerMillion": 5000000,
      "cachedInputMicrousdPerMillion": 500000,
      "cacheWriteMicrousdPerMillion": 5000000,
      "outputMicrousdPerMillion": 30000000,
      "longContextThresholdTokens": 272000,
      "longContextInputMultiplier": { "numerator": 2, "denominator": 1 },
      "longContextOutputMultiplier": { "numerator": 3, "denominator": 2 }
    }
  ]
}
```

Create the entire platform catalog as follows.

```json
{
  "catalogVersion": "2026-07-11.1",
  "presets": [
    { "id": "YOUTUBE_SHORTS", "canvas": { "width": 1080, "height": 1920 }, "safeArea": { "top": 0.08, "right": 0.06, "bottom": 0.2, "left": 0.06 } },
    { "id": "INSTAGRAM_REELS", "canvas": { "width": 1080, "height": 1920 }, "safeArea": { "top": 0.08, "right": 0.08, "bottom": 0.22, "left": 0.08 } },
    { "id": "TIKTOK", "canvas": { "width": 1080, "height": 1920 }, "safeArea": { "top": 0.1, "right": 0.1, "bottom": 0.24, "left": 0.08 } }
  ]
}
```

```ts
// packages/config/src/catalog-schema.ts
import { z } from 'zod';
const positiveInteger = z.number().int().positive();
const multiplier = z.object({ numerator:positiveInteger, denominator:positiveInteger }).strict();
export const CatalogSchema = z.object({ catalogVersion:z.string().min(1), models:z.array(z.object({ id:z.enum(['gpt-5.6-sol','gpt-5.5']), provider:z.literal('OPENAI'), reasoning:z.array(z.object({ effort:z.enum(['none','low','medium','high','xhigh','max']), maxGeneratedTokens:positiveInteger }).strict()).min(5).max(6), defaultReasoning:z.literal('high'), structuredOutputs:z.literal(true), providerMaxOutputTokens:z.literal(128000), availabilityHint:z.enum(['ENTITLEMENT_REQUIRED','STANDARD']), promptCachePolicy:z.enum(['EXPLICIT_DISABLED','LEGACY_AUTOMATIC_NO_WRITE_FEE']), longContextThresholdTokens:positiveInteger }).strict()).length(2) }).strict();
export const PricingCatalogSchema = z.object({ catalogVersion:z.string().min(1), currency:z.literal('USD'), unit:z.literal('MICRO_USD_PER_MILLION_TOKENS'), rules:z.array(z.object({ modelId:z.string().min(1), tier:z.literal('STANDARD'), effectiveFrom:z.string().datetime(), inputMicrousdPerMillion:positiveInteger, cachedInputMicrousdPerMillion:positiveInteger, cacheWriteMicrousdPerMillion:positiveInteger, outputMicrousdPerMillion:positiveInteger, longContextThresholdTokens:positiveInteger, longContextInputMultiplier:multiplier, longContextOutputMultiplier:multiplier }).strict()).min(1) }).strict();
const edge = z.number().min(0).max(1);
export const PlatformCatalogSchema = z.object({ catalogVersion:z.string().min(1), presets:z.array(z.object({ id:z.enum(['YOUTUBE_SHORTS','INSTAGRAM_REELS','TIKTOK']), canvas:z.object({width:z.literal(1080),height:z.literal(1920)}).strict(), safeArea:z.object({top:edge,right:edge,bottom:edge,left:edge}).strict() }).strict()).length(3) }).strict();
```

```ts
// packages/config/src/catalog.ts
import modelsJson from './model-catalog.json';
import pricingJson from './pricing-catalog.json';
import platformsJson from './platform-catalog.json';
import { CatalogSchema, PlatformCatalogSchema, PricingCatalogSchema } from './catalog-schema';

const models = CatalogSchema.parse(modelsJson);
const pricing = PricingCatalogSchema.parse(pricingJson);
const platforms = PlatformCatalogSchema.parse(platformsJson);

export const listCompatibleModels = () => models.models.map((model) => Object.assign({}, model, { catalogVersion: models.catalogVersion }));

export function getModel(modelId: string) {
  const model = models.models.find((item) => item.id === modelId);
  if (!model) throw new Error(`Unsupported model: ${modelId}`);
  return Object.assign({}, model, { catalogVersion: models.catalogVersion });
}

export const supportsReasoning = (modelId: string, reasoning: string) =>
  getModel(modelId).reasoning.some((profile) => profile.effort === reasoning);

export function getPlatformPreset(id: string) {
  const preset = platforms.presets.find((item) => item.id === id);
  if (!preset) throw new Error(`Unsupported platform preset: ${id}`);
  return preset;
}
export function getPricing(modelId: string, catalogVersion: string) {
  if (pricing.catalogVersion !== catalogVersion) throw new Error(`Unsupported pricing catalog: ${catalogVersion}`);
  const rule = pricing.rules.find((item) => item.modelId === modelId);
  if (!rule) throw new Error(`Pricing unavailable for model: ${modelId}`);
  return rule;
}
```

- [ ] Run `pnpm --filter @clip-factory/config test -- catalog.test.ts`; expect PASS. Run `pnpm test:architecture`; expect PASS because catalog policy imports no app/framework/provider.

- [ ] **RED: test secret placement and environment validation.**

```python
# apps/worker/tests/composition/test_settings.py
import pytest
from clip_factory.composition.settings import WorkerSettings


def test_worker_requires_openai_key_only_when_paid_adapter_is_selected() -> None:
    fake = WorkerSettings.from_mapping({"OPENAI_ADAPTER": "fake", "INTERNAL_SERVICE_TOKEN": "local-test-token"})
    assert fake.openai_api_key is None
    with pytest.raises(ValueError, match="OPENAI_API_KEY is required for live OpenAI adapter"):
        WorkerSettings.from_mapping({"OPENAI_ADAPTER": "live", "INTERNAL_SERVICE_TOKEN": "local-test-token"})
```

- [ ] First create `settings.py` with the declared dataclass and a `from_mapping` shell that returns fake defaults, then run `uv run --directory apps/worker pytest tests/composition/test_settings.py --collect-only -q`; expect PASS. Run the test normally; expect the named live-adapter missing-key assertion to FAIL because the shell does not raise.

- [ ] **GREEN: create the complete worker setting object.**

```python
# apps/worker/src/clip_factory/composition/settings.py
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import SecretStr


@dataclass(frozen=True)
class WorkerSettings:
    openai_adapter: Literal["fake", "live"]
    openai_api_key: SecretStr | None
    internal_service_token: SecretStr
    internal_api_base_url: str
    temporal_address: str
    redis_url: str
    minio_endpoint: str
    minio_access_key: SecretStr
    minio_secret_key: SecretStr
    allowed_source_roots: Sequence[Path]

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "WorkerSettings":
        adapter = values.get("OPENAI_ADAPTER", "fake")
        if adapter not in {"fake", "live"}:
            raise ValueError(f"Unsupported OPENAI_ADAPTER: {adapter}")
        api_key = values.get("OPENAI_API_KEY")
        if adapter == "live" and not api_key:
            raise ValueError("OPENAI_API_KEY is required for live OpenAI adapter")
        token = values.get("INTERNAL_SERVICE_TOKEN")
        if not token:
            raise ValueError("INTERNAL_SERVICE_TOKEN is required")
        roots = tuple(Path(value).expanduser() for value in values.get("ALLOWED_SOURCE_ROOTS", "~/Movies").split(":"))
        return cls(
            openai_adapter=adapter,
            openai_api_key=SecretStr(api_key) if api_key else None,
            internal_service_token=SecretStr(token),
            internal_api_base_url=values.get("INTERNAL_API_BASE_URL", "http://127.0.0.1:3000"),
            temporal_address=values.get("TEMPORAL_ADDRESS", "127.0.0.1:7233"),
            redis_url=values.get("REDIS_URL", "redis://127.0.0.1:6379/0"),
            minio_endpoint=values.get("MINIO_ENDPOINT", "http://127.0.0.1:9000"),
            minio_access_key=SecretStr(values.get("MINIO_ACCESS_KEY", "clip_factory_local")),
            minio_secret_key=SecretStr(values.get("MINIO_SECRET_KEY", "clip_factory_local_secret")),
            allowed_source_roots=roots,
        )
```

Create `loadServerEnv()` from a strict Zod object containing exactly `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `TEMPORAL_ADDRESS`, and `INTERNAL_SERVICE_TOKEN`. Construct a new owned-key object by reading only those seven properties from `process.env`, then call `schema.parse(ownedValues)`; never pass ambient `process.env` directly to a strict schema. Tests add unrelated `PATH`, `HOME`, and CI variables and still pass, while an unknown key supplied directly to the schema fails. The literal string `OPENAI_API_KEY` must not occur in that production file.

Create `.env.example` with these exact nonsecret local values:

```dotenv
POSTGRES_DB=clip_factory
POSTGRES_USER=clip_factory
POSTGRES_PASSWORD=clip_factory_local_dev
DATABASE_URL=postgresql://clip_factory:clip_factory_local_dev@127.0.0.1:5432/clip_factory
REDIS_URL=redis://127.0.0.1:6379/0
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=clip_factory_local
MINIO_SECRET_KEY=clip_factory_local_secret
TEMPORAL_ADDRESS=127.0.0.1:7233
INTERNAL_SERVICE_TOKEN=clip_factory_worker_local_token
INTERNAL_API_BASE_URL=http://127.0.0.1:3000
ALLOWED_SOURCE_ROOTS=~/Movies:~/Videos
OPENAI_ADAPTER=fake
OPENAI_API_KEY=
```

- [ ] Run the Python test and `pnpm exec vitest run apps/web/src/config/server-env.test.ts`; expect PASS. Run `rg -n 'OPENAI_API_KEY' apps/web packages`; expect no matches outside tests that assert its absence.

- [ ] **REFACTOR:** freeze parsed objects, return typed catalog errors, test malformed JSON, duplicate IDs, unknown enum values, invalid money integers, invalid normalized safe areas, and model/reasoning incompatibility. Keep catalog and environment tests green.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm verify
# Expected: PASS
```

## Broader verification

```bash
pnpm --filter @clip-factory/config test
pnpm exec vitest run apps/web/src/config/server-env.test.ts
uv run --directory apps/worker pytest tests/composition/test_settings.py -q
pnpm test:architecture
git check-ignore .env
git diff --check
```

Expected: all pass; `git check-ignore .env` prints `.env`; no secret value is present in tracked files.

**Suggested commit:** `feat: add validated local configuration catalogs`
