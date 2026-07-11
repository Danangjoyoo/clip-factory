import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '../../../apps/web/src/generated/prisma/client';
import {
  makePrismaTestClient,
  resetDatabase,
} from '../support/prisma-test-client';

const sha = 'a'.repeat(64);
const projectData = {
  name: 'Schema test',
  mode: 'MANUAL' as const,
  languageTag: 'en',
  defaultMaxClipSeconds: 60,
  defaultPlatformPreset: 'YOUTUBE_SHORTS' as const,
};

describe.skipIf(!process.env.DATABASE_URL)('Phase 1 core schema', () => {
  let prisma: Awaited<ReturnType<typeof makePrismaTestClient>>;

  beforeAll(async () => {
    prisma = await makePrismaTestClient();
    await resetDatabase();
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  });
  afterAll(() => prisma.$disconnect());

  it('keeps source locator states and kind-specific references valid', async () => {
    const pendingLocal = await prisma.sourceAsset.create({
      data: {
        project: { create: projectData },
        kind: 'LOCAL_FILE',
        displayPath: '/tmp/input.mp4',
      },
    });
    expect(pendingLocal.resolvedPath).toBeNull();

    const pendingUpload = await prisma.sourceAsset.create({
      data: {
        project: { create: { ...projectData, name: 'Upload pending' } },
        kind: 'BROWSER_UPLOAD',
        displayPath: 'upload.mp4',
      },
    });
    expect(pendingUpload.objectKey).toBeNull();

    const localProject = await prisma.project.create({
      data: { ...projectData, name: 'Located local' },
    });
    const local = await prisma.sourceAsset.create({
      data: {
        projectId: localProject.id,
        kind: 'LOCAL_FILE',
        displayPath: '/tmp/input.mp4',
        resolvedPath: '/mnt/input.mp4',
        sizeBytes: 123n,
        modifiedAt: new Date('2026-07-11T00:00:00Z'),
        fingerprint: 'mtime:size:sha',
        health: 'LOCATED',
      },
    });
    expect(local.resolvedPath).toBe('/mnt/input.mp4');

    const uploadProject = await prisma.project.create({
      data: { ...projectData, name: 'Located upload' },
    });
    const upload = await prisma.sourceAsset.create({
      data: {
        projectId: uploadProject.id,
        kind: 'BROWSER_UPLOAD',
        displayPath: 'upload.mp4',
        objectKey: 'sources/upload.mp4',
        objectSha256: sha,
        sizeBytes: 456n,
        health: 'LOCATED',
      },
    });
    expect(upload.objectKey).toBe('sources/upload.mp4');

    await expect(
      prisma.sourceAsset.create({
        data: {
          project: { create: { ...projectData, name: 'Bad local' } },
          kind: 'LOCAL_FILE',
          displayPath: 'x',
          objectKey: 'forbidden',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.sourceAsset.create({
        data: {
          project: { create: { ...projectData, name: 'Bad upload' } },
          kind: 'BROWSER_UPLOAD',
          displayPath: 'x',
          resolvedPath: '/forbidden',
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.sourceAsset.create({
        data: {
          project: { create: { ...projectData, name: 'Bad health' } },
          kind: 'LOCAL_FILE',
          displayPath: 'x',
          health: 'HEALTHY',
        },
      }),
    ).rejects.toThrow();
    const healthy = await prisma.sourceAsset.create({
      data: {
        project: { create: { ...projectData, name: 'Healthy' } },
        kind: 'LOCAL_FILE',
        displayPath: 'x',
        resolvedPath: '/x',
        sizeBytes: 1n,
        modifiedAt: new Date(),
        fingerprint: 'fingerprint',
        health: 'HEALTHY',
        probeJson: { durationMs: 1 },
      },
    });
    expect(healthy.probeJson).toEqual({ durationMs: 1 });
  });

  it('enforces money, clip bounds, UTC timestamps, and 64-bit round trips', async () => {
    await expect(
      prisma.project.create({
        data: { ...projectData, name: 'Negative', openaiSpendMicrousd: -1n },
      }),
    ).rejects.toThrow();
    const project = await prisma.project.create({
      data: {
        ...projectData,
        name: 'Money',
        openaiSpendMicrousd: 9007199254740993n,
      },
    });
    expect(project.openaiSpendMicrousd).toBe(9007199254740993n);
    const run = await prisma.analysisRun.create({
      data: {
        projectId: project.id,
        modelId: 'gpt',
        reasoning: 'HIGH',
        promptVersion: 'p1',
        schemaVersion: '1',
        pricingVersion: 'v1',
        budgetMicrousd: 9007199254740993n,
        coverageStartMs: 0,
        coverageEndMs: 60_000,
        estimatedMaxMicrousd: 1n,
      },
    });
    expect(run.budgetMicrousd).toBe(9007199254740993n);
    const usageData = {
      projectId: project.id,
      analysisRunId: run.id,
      providerResponseId: 'resp_unique',
      requestHash: sha,
      purpose: 'HIGHLIGHT_WINDOW',
      modelId: 'gpt',
      reasoning: 'HIGH',
      promptVersion: 'p1',
      schemaVersion: '1',
      pricingVersion: 'v1',
      inputTokens: 1,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      pricingTier: 'STANDARD',
      costMicrousd: 9007199254740993n,
      occurredAt: new Date('2026-07-11T03:00:00+03:00'),
    };
    const event = await prisma.aIUsageEvent.create({ data: usageData });
    expect(event.costMicrousd).toBe(9007199254740993n);
    expect(event.occurredAt.toISOString()).toBe('2026-07-11T00:00:00.000Z');
    await expect(
      prisma.aIUsageEvent.create({ data: usageData }),
    ).rejects.toThrow();

    await expect(
      prisma.clip.create({
        data: {
          projectId: project.id,
          origin: 'MANUAL',
          startMs: 10,
          endMs: 10,
          captionJson: {},
          styleJson: {},
          frameJson: {},
        },
      }),
    ).rejects.toThrow();
    const clip = await prisma.clip.create({
      data: {
        projectId: project.id,
        analysisRunId: run.id,
        origin: 'MANUAL',
        startMs: 10,
        endMs: 20,
        captionJson: {},
        styleJson: {},
        frameJson: {},
      },
    });
    expect(clip.endMs - clip.startMs).toBe(10);
  });

  it('cascades project-owned rows and preserves every declared unique index', async () => {
    const project = await prisma.project.create({
      data: { ...projectData, name: 'Cascade' },
    });
    await prisma.uploadSession.create({
      data: {
        projectId: project.id,
        objectKey: 'x',
        uploadId: 'upload-unique',
        sizeBytes: 1n,
        completedPartsJson: [],
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.project.delete({ where: { id: project.id } });
    expect(
      await prisma.uploadSession.count({ where: { projectId: project.id } }),
    ).toBe(0);

    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
        'source_assets_project_id_key', 'transcripts_project_id_key', 'transcripts_source_asset_id_key',
        'ai_usage_events_provider_response_id_key', 'paid_call_reservations_call_id_key',
        'paid_call_reservations_provider_response_id_key', 'paid_call_reservations_usage_event_id_key',
        'cost_allocations_analysis_run_id_clip_id_key', 'job_projections_workflow_id_run_id_key',
        'upload_sessions_upload_id_key', 'idempotency_receipts_key_key'
      )`;
    expect(new Set(rows.map(({ indexname }) => indexname))).toEqual(
      new Set([
        'source_assets_project_id_key',
        'transcripts_project_id_key',
        'transcripts_source_asset_id_key',
        'ai_usage_events_provider_response_id_key',
        'paid_call_reservations_call_id_key',
        'paid_call_reservations_provider_response_id_key',
        'paid_call_reservations_usage_event_id_key',
        'cost_allocations_analysis_run_id_clip_id_key',
        'job_projections_workflow_id_run_id_key',
        'upload_sessions_upload_id_key',
        'idempotency_receipts_key_key',
      ]),
    );
  });

  it('rejects duplicate values for every declared unique index', async () => {
    const expectP2002 = async (operation: () => Promise<unknown>) => {
      try {
        await operation();
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error).toMatchObject({ code: 'P2002' });
        return;
      }
      throw new Error('Expected a unique constraint violation');
    };

    const project = await prisma.project.create({
      data: { ...projectData, name: 'Unique constraints' },
    });
    const source = await prisma.sourceAsset.create({
      data: {
        projectId: project.id,
        kind: 'LOCAL_FILE',
        displayPath: '/tmp/unique.mp4',
      },
    });
    await expectP2002(() =>
      prisma.sourceAsset.create({
        data: {
          projectId: project.id,
          kind: 'LOCAL_FILE',
          displayPath: '/tmp/duplicate.mp4',
        },
      }),
    );

    const transcript = await prisma.transcript.create({
      data: {
        projectId: project.id,
        sourceAssetId: source.id,
        backend: 'whisper',
        model: 'large-v3',
        modelRevision: 'r1',
        languageTag: 'en',
        objectKey: 'transcripts/unique.json',
        objectSha256: sha,
        durationMs: 1_000,
        wordCount: 1,
        runtimeMs: 10,
      },
    });
    const otherProject = await prisma.project.create({
      data: { ...projectData, name: 'Unique constraints other' },
    });
    await expectP2002(() =>
      prisma.transcript.create({
        data: {
          projectId: otherProject.id,
          sourceAssetId: source.id,
          backend: 'whisper',
          model: 'large-v3',
          modelRevision: 'r1',
          languageTag: 'en',
          objectKey: 'transcripts/duplicate-source.json',
          objectSha256: sha,
          durationMs: 1_000,
          wordCount: 1,
          runtimeMs: 10,
        },
      }),
    );
    const transcriptSource = await prisma.sourceAsset.create({
      data: {
        projectId: otherProject.id,
        kind: 'LOCAL_FILE',
        displayPath: '/tmp/other.mp4',
      },
    });
    await expectP2002(() =>
      prisma.transcript.create({
        data: {
          projectId: project.id,
          sourceAssetId: transcriptSource.id,
          backend: 'whisper',
          model: 'large-v3',
          modelRevision: 'r1',
          languageTag: 'en',
          objectKey: 'transcripts/duplicate-project.json',
          objectSha256: sha,
          durationMs: 1_000,
          wordCount: 1,
          runtimeMs: 10,
        },
      }),
    );

    const run = await prisma.analysisRun.create({
      data: {
        projectId: project.id,
        modelId: 'gpt',
        reasoning: 'NONE',
        promptVersion: 'p1',
        schemaVersion: '1',
        pricingVersion: 'v1',
        budgetMicrousd: 1n,
        coverageStartMs: 0,
        coverageEndMs: 1_000,
        estimatedMaxMicrousd: 1n,
      },
    });
    const clip = await prisma.clip.create({
      data: {
        projectId: project.id,
        analysisRunId: run.id,
        origin: 'MANUAL',
        startMs: 0,
        endMs: 1,
        captionJson: {},
        styleJson: {},
        frameJson: {},
      },
    });
    const usage = await prisma.aIUsageEvent.create({
      data: {
        projectId: project.id,
        analysisRunId: run.id,
        providerResponseId: 'unique-provider-response',
        requestHash: sha,
        purpose: 'HIGHLIGHT_WINDOW',
        modelId: 'gpt',
        reasoning: 'NONE',
        promptVersion: 'p1',
        schemaVersion: '1',
        pricingVersion: 'v1',
        inputTokens: 1,
        cachedInputTokens: 0,
        cacheWriteInputTokens: 0,
        outputTokens: 1,
        reasoningTokens: 0,
        pricingTier: 'STANDARD',
        costMicrousd: 1n,
        occurredAt: new Date(),
      },
    });
    await expectP2002(() =>
      prisma.aIUsageEvent.create({
        data: {
          projectId: project.id,
          analysisRunId: run.id,
          providerResponseId: 'unique-provider-response',
          requestHash: sha,
          purpose: 'HIGHLIGHT_WINDOW',
          modelId: 'gpt',
          reasoning: 'NONE',
          promptVersion: 'p1',
          schemaVersion: '1',
          pricingVersion: 'v1',
          inputTokens: 1,
          cachedInputTokens: 0,
          cacheWriteInputTokens: 0,
          outputTokens: 1,
          reasoningTokens: 0,
          pricingTier: 'STANDARD',
          costMicrousd: 1n,
          occurredAt: new Date(),
        },
      }),
    );

    const reservation = await prisma.paidCallReservation.create({
      data: {
        projectId: project.id,
        analysisRunId: run.id,
        callId: '00000000-0000-4000-8000-000000000001',
        requestHash: sha,
        worstCaseMicrousd: 1n,
        providerResponseId: 'unique-paid-response',
        usageEventId: usage.id,
      },
    });
    await expectP2002(() =>
      prisma.paidCallReservation.create({
        data: {
          projectId: project.id,
          analysisRunId: run.id,
          callId: reservation.callId,
          requestHash: sha,
          worstCaseMicrousd: 1n,
        },
      }),
    );
    await expectP2002(() =>
      prisma.paidCallReservation.create({
        data: {
          projectId: project.id,
          analysisRunId: run.id,
          callId: '00000000-0000-4000-8000-000000000002',
          requestHash: sha,
          worstCaseMicrousd: 1n,
          providerResponseId: reservation.providerResponseId,
        },
      }),
    );
    await expectP2002(() =>
      prisma.paidCallReservation.create({
        data: {
          projectId: project.id,
          analysisRunId: run.id,
          callId: '00000000-0000-4000-8000-000000000003',
          requestHash: sha,
          worstCaseMicrousd: 1n,
          usageEventId: usage.id,
        },
      }),
    );

    await prisma.costAllocation.create({
      data: { analysisRunId: run.id, clipId: clip.id, amountMicrousd: 1n },
    });
    await expectP2002(() =>
      prisma.costAllocation.create({
        data: { analysisRunId: run.id, clipId: clip.id, amountMicrousd: 2n },
      }),
    );

    await prisma.jobProjection.create({
      data: {
        projectId: project.id,
        workflowId: '00000000-0000-4000-8000-000000000010',
        runId: 'unique-run',
        status: 'QUEUED',
        stage: 'queued',
        progressBasisPoints: 0,
      },
    });
    await expectP2002(() =>
      prisma.jobProjection.create({
        data: {
          projectId: project.id,
          workflowId: '00000000-0000-4000-8000-000000000010',
          runId: 'unique-run',
          status: 'QUEUED',
          stage: 'queued',
          progressBasisPoints: 0,
        },
      }),
    );

    await prisma.uploadSession.create({
      data: {
        projectId: project.id,
        objectKey: 'uploads/unique',
        uploadId: 'unique-upload',
        sizeBytes: 1n,
        completedPartsJson: [],
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await expectP2002(() =>
      prisma.uploadSession.create({
        data: {
          projectId: project.id,
          objectKey: 'uploads/duplicate',
          uploadId: 'unique-upload',
          sizeBytes: 1n,
          completedPartsJson: [],
          expiresAt: new Date(Date.now() + 60_000),
        },
      }),
    );

    const idempotencyKey = '00000000-0000-4000-8000-000000000020';
    await prisma.idempotencyReceipt.create({
      data: {
        key: idempotencyKey,
        scope: 'test',
        requestHash: sha,
        status: 'DONE',
      },
    });
    await expectP2002(() =>
      prisma.idempotencyReceipt.create({
        data: {
          key: idempotencyKey,
          scope: 'test',
          requestHash: sha,
          status: 'DONE',
        },
      }),
    );

    expect(transcript.id).toBeTruthy();
  });
});
