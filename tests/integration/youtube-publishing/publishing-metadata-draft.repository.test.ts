import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPublishingMetadataDraftRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publishing-metadata-draft.repository';
import { MetadataDraftState } from '../../../apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto';
import { integrationEnabled } from '../support/test-environment';

async function makeDatabase() {
  return (await import('../../../apps/web/src/infrastructure/prisma/client'))
    .prisma;
}

describe.skipIf(!integrationEnabled)(
  'PrismaPublishingMetadataDraftRepository',
  () => {
    const ids = {
      project: randomUUID(),
      clip: randomUUID(),
      run: randomUUID(),
      usage: randomUUID(),
    };
    let database: Awaited<ReturnType<typeof makeDatabase>>;
    let repository: PrismaPublishingMetadataDraftRepository;

    beforeEach(async () => {
      database = await makeDatabase();
      repository = new PrismaPublishingMetadataDraftRepository(database);
      await database.$executeRawUnsafe(
        `delete from projects where id = '${ids.project}'`,
      );
      await database.$executeRawUnsafe(
        `insert into projects (id, name, mode, language_tag, default_max_clip_seconds, default_platform_preset, updated_at) values ('${ids.project}', 'metadata', 'MANUAL', 'en', 60, 'YOUTUBE_SHORTS', now())`,
      );
      await database.$executeRawUnsafe(
        `insert into analysis_runs (id, project_id, model_id, reasoning, prompt_version, schema_version, pricing_version, budget_microusd, coverage_start_ms, coverage_end_ms, estimated_max_microusd, updated_at) values ('${ids.run}', '${ids.project}', 'gpt-5.6', 'HIGH', 'v1', 'v1', 'v1', 10000, 0, 1000, 10000, now())`,
      );
      await database.$executeRawUnsafe(
        `insert into clips (id, project_id, origin, start_ms, end_ms, caption_json, style_json, frame_json, updated_at) values ('${ids.clip}', '${ids.project}', 'MANUAL', 0, 1000, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, now())`,
      );
      await database.$executeRawUnsafe(
        `insert into ai_usage_events (id, project_id, analysis_run_id, clip_id, provider_response_id, request_hash, purpose, model_id, reasoning, prompt_version, schema_version, pricing_version, input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens, reasoning_tokens, pricing_tier, cost_microusd, occurred_at) values ('${ids.usage}', '${ids.project}', '${ids.run}', '${ids.clip}', 'metadata-${ids.usage}', '${'a'.repeat(64)}', 'YOUTUBE_METADATA_GENERATION', 'gpt-5.6', 'HIGH', 'v1', 'v1', 'v1', 1, 0, 0, 1, 0, 'standard', 12345, now())`,
      );
    });

    afterAll(async () => {
      await database?.$disconnect();
    });

    const draft = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: randomUUID() as never,
      projectId: ids.project as never,
      clipId: ids.clip as never,
      version: 1,
      revision: 1,
      state: MetadataDraftState.Draft,
      source: 'MANUAL' as const,
      metadata: {
        title: 'Title',
        description: '',
        hashtags: [],
        keywordTags: [],
        categoryId: '22',
        defaultLanguage: 'en',
        madeForKids: false,
        containsSyntheticMedia: false,
      },
      publishingInstruction: null,
      modelId: null,
      reasoningLevel: null,
      maxCostMicrousd: 0n,
      estimatedCostMicrousd: 0n,
      actualCostMicrousd: 0n,
      aiUsageEventId: null,
      approvedAt: null,
      supersededAt: null,
      ...overrides,
    });

    it('keeps old versions, links exact usage, rejects stale revisions', async () => {
      const first = await repository.insertVersion(
        draft({
          state: MetadataDraftState.Approved,
          approvedAt: new Date(),
        }) as never,
      );
      const second = await repository.insertVersion(
        draft({
          version: 2,
          state: MetadataDraftState.AwaitingApproval,
          source: 'OPENAI',
          modelId: 'gpt-5.6',
          reasoningLevel: 'high',
          actualCostMicrousd: 12_345n,
          aiUsageEventId: ids.usage,
        }) as never,
      );
      expect(await repository.listForClip(ids.clip as never)).toHaveLength(2);
      expect(second.aiUsageEventId).toBe(ids.usage);
      expect(first.state).toBe(MetadataDraftState.Approved);
      expect(
        await repository.updateEditableRevision(first.id, 1, {
          ...first.metadata,
          title: 'Winner',
        }),
      ).toMatchObject({ revision: 2, metadata: { title: 'Winner' } });
      await expect(
        repository.updateEditableRevision(first.id, 1, {
          ...first.metadata,
          title: 'Stale',
        }),
      ).resolves.toBeNull();
      await expect(repository.findById(first.id)).resolves.toMatchObject({
        version: 1,
        revision: 2,
        metadata: { title: 'Winner' },
      });
    });

    it('database enforces unique versions, manual zero actual cost, and AI usage FK', async () => {
      await repository.insertVersion(draft() as never);
      await expect(
        repository.insertVersion(draft() as never),
      ).rejects.toBeDefined();
      await expect(
        database.$executeRawUnsafe(
          `insert into publishing_metadata_drafts (id, project_id, clip_id, version, state, source, title, description, hashtags, keyword_tags, category_id, default_language, made_for_kids, contains_synthetic_media, actual_cost_microusd) values ('${randomUUID()}', '${ids.project}', '${ids.clip}', 2, 'METADATA_DRAFT', 'MANUAL', 'x', '', '[]', '[]', '22', 'en', false, false, 1)`,
        ),
      ).rejects.toBeDefined();
      await expect(
        repository.insertVersion(
          draft({
            version: 3,
            source: 'OPENAI',
            modelId: 'gpt-5.6',
            reasoningLevel: 'high',
            aiUsageEventId: randomUUID(),
            actualCostMicrousd: 1n,
          }) as never,
        ),
      ).rejects.toBeDefined();
      await expect(
        database.$executeRawUnsafe(
          `insert into publishing_metadata_drafts (id, project_id, clip_id, version, state, source, title, description, hashtags, keyword_tags, category_id, default_language, made_for_kids, contains_synthetic_media, model_id, reasoning_level, estimated_cost_microusd, actual_cost_microusd) values ('${randomUUID()}', '${ids.project}', '${ids.clip}', 4, 'AWAITING_APPROVAL', 'OPENAI', 'x', '', '[]', '[]', '22', 'en', false, false, 'gpt-5.6', 'high', -1, 0)`,
        ),
      ).rejects.toBeDefined();
      await expect(
        database.$executeRawUnsafe(
          `insert into publishing_metadata_drafts (id, project_id, clip_id, version, state, source, title, description, hashtags, keyword_tags, category_id, default_language, made_for_kids, contains_synthetic_media, model_id, reasoning_level, estimated_cost_microusd, actual_cost_microusd) values ('${randomUUID()}', '${ids.project}', '${ids.clip}', 5, 'AWAITING_APPROVAL', 'OPENAI', 'x', '', '[]', '[]', '22', 'en', false, false, 'gpt-5.6', 'high', 0, -1)`,
        ),
      ).rejects.toBeDefined();
    });
  },
);
