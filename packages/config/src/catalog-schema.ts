import { z } from 'zod';

const positiveInteger = z.number().int().positive();
const multiplier = z
  .object({ numerator: positiveInteger, denominator: positiveInteger })
  .strict();
const edge = z.number().min(0).max(1);

const model = z
  .object({
    id: z.enum(['gpt-5.6-sol', 'gpt-5.5']),
    provider: z.literal('OPENAI'),
    reasoning: z
      .array(
        z
          .object({
            effort: z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
            maxGeneratedTokens: positiveInteger,
          })
          .strict(),
      )
      .min(5)
      .max(6),
    defaultReasoning: z.literal('high'),
    structuredOutputs: z.literal(true),
    providerMaxOutputTokens: z.literal(128000),
    availabilityHint: z.enum(['ENTITLEMENT_REQUIRED', 'STANDARD']),
    promptCachePolicy: z.enum([
      'EXPLICIT_DISABLED',
      'LEGACY_AUTOMATIC_NO_WRITE_FEE',
    ]),
    longContextThresholdTokens: positiveInteger,
  })
  .strict();

export const CatalogSchema = z
  .object({
    catalogVersion: z.string().min(1),
    models: z.array(model).length(2),
  })
  .strict();
export const PricingCatalogSchema = z
  .object({
    catalogVersion: z.string().min(1),
    currency: z.literal('USD'),
    unit: z.literal('MICRO_USD_PER_MILLION_TOKENS'),
    rules: z
      .array(
        z
          .object({
            modelId: z.string().min(1),
            tier: z.literal('STANDARD'),
            effectiveFrom: z.string().datetime(),
            inputMicrousdPerMillion: positiveInteger,
            cachedInputMicrousdPerMillion: positiveInteger,
            cacheWriteMicrousdPerMillion: positiveInteger,
            outputMicrousdPerMillion: positiveInteger,
            longContextThresholdTokens: positiveInteger,
            longContextInputMultiplier: multiplier,
            longContextOutputMultiplier: multiplier,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export const PlatformCatalogSchema = z
  .object({
    catalogVersion: z.string().min(1),
    presets: z
      .array(
        z
          .object({
            id: z.enum(['YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK']),
            canvas: z
              .object({ width: z.literal(1080), height: z.literal(1920) })
              .strict(),
            safeArea: z
              .object({ top: edge, right: edge, bottom: edge, left: edge })
              .strict(),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();
