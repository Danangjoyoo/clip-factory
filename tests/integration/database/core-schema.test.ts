import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  makePrismaTestClient,
  resetDatabase,
} from '../support/prisma-test-client';

describe.skipIf(!process.env.DATABASE_URL)('Phase 1 core schema', () => {
  let prisma: Awaited<ReturnType<typeof makePrismaTestClient>>;
  beforeAll(async () => {
    prisma = await makePrismaTestClient();
    await resetDatabase();
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  });
  afterAll(() => prisma.$disconnect());

  it('rejects negative spend and duplicate provider responses', async () => {
    await expect(
      prisma.project.create({
        data: {
          name: 'Sample',
          mode: 'MANUAL',
          languageTag: 'en',
          defaultMaxClipSeconds: 60,
          defaultPlatformPreset: 'YOUTUBE_SHORTS',
          openaiSpendMicrousd: -1n,
        },
      }),
    ).rejects.toThrow();

    const project = await prisma.project.create({
      data: {
        name: 'Sample',
        mode: 'AI_HIGHLIGHTS',
        languageTag: 'en',
        defaultMaxClipSeconds: 60,
        defaultPlatformPreset: 'YOUTUBE_SHORTS',
      },
    });
    const run = await prisma.analysisRun.create({
      data: {
        projectId: project.id,
        modelId: 'gpt',
        reasoning: 'HIGH',
        promptVersion: 'p1',
        schemaVersion: '1.0.0',
        pricingVersion: 'v1',
        budgetMicrousd: 1000000n,
        coverageStartMs: 0,
        coverageEndMs: 60000,
        estimatedMaxMicrousd: 500000n,
      },
    });
    const usage = {
      projectId: project.id,
      analysisRunId: run.id,
      providerResponseId: 'resp_001',
      requestHash: 'a'.repeat(64),
      purpose: 'HIGHLIGHT_WINDOW',
      modelId: 'gpt',
      reasoning: 'HIGH' as const,
      promptVersion: 'p1',
      schemaVersion: '1.0.0',
      pricingVersion: 'v1',
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 50,
      reasoningTokens: 20,
      pricingTier: 'STANDARD',
      costMicrousd: 900n,
      occurredAt: new Date('2026-07-11T00:00:00Z'),
    };
    await prisma.aIUsageEvent.create({ data: usage });
    await expect(
      prisma.aIUsageEvent.create({ data: usage }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
