import { describe, expect, it } from 'vitest';
import { MetadataDraftState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import { metadataDraftRecordToEntity } from './publishing-metadata-draft.converter';

const record = (overrides: Record<string, unknown> = {}) => ({
  id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52',
  project_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb50',
  clip_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb51',
  version: 1,
  revision: 1,
  state: 'AWAITING_APPROVAL',
  source: 'OPENAI',
  title: 'Title',
  description: '',
  hashtags: ['#clip'],
  keyword_tags: ['clip'],
  category_id: '22',
  default_language: 'en',
  made_for_kids: false,
  contains_synthetic_media: false,
  publishing_instruction: null,
  model_id: 'gpt-5.6-sol',
  reasoning_level: 'high',
  max_cost_microusd: 20_000n,
  estimated_cost_microusd: 20_000n,
  actual_cost_microusd: 12_345n,
  ai_usage_event_id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54',
  approved_at: null,
  superseded_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('metadataDraftRecordToEntity', () => {
  it('maps OpenAI provenance and bigint exactly', () => {
    expect(metadataDraftRecordToEntity(record() as never)).toMatchObject({
      state: MetadataDraftState.AwaitingApproval,
      source: 'OPENAI',
      estimatedCostMicrousd: 20_000n,
      actualCostMicrousd: 12_345n,
      aiUsageEventId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb54',
    });
  });
  it('rejects invalid record values', () => {
    expect(() =>
      metadataDraftRecordToEntity(record({ state: 'PUBLISHED' }) as never),
    ).toThrow('unknown publishing metadata draft state PUBLISHED');
    expect(() =>
      metadataDraftRecordToEntity(
        record({ hashtags: { tag: '#bad' } }) as never,
      ),
    ).toThrow('hashtags must be a string array');
  });
});
