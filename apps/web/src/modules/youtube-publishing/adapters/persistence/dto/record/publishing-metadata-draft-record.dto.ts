export type PublishingMetadataDraftRecordState =
  | 'METADATA_DRAFT'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'SUPERSEDED';

export type PublishingMetadataDraftRecordSource = 'MANUAL' | 'OPENAI';

export type PublishingMetadataDraftRecordDto = {
  id: string;
  project_id: string;
  clip_id: string;
  version: number;
  revision: number;
  state: PublishingMetadataDraftRecordState;
  source: PublishingMetadataDraftRecordSource;
  title: string;
  description: string;
  hashtags: unknown;
  keyword_tags: unknown;
  category_id: string;
  default_language: string;
  made_for_kids: boolean;
  contains_synthetic_media: boolean;
  publishing_instruction: string | null;
  model_id: string | null;
  reasoning_level: string | null;
  max_cost_microusd: bigint;
  estimated_cost_microusd: bigint;
  actual_cost_microusd: bigint;
  ai_usage_event_id: string | null;
  approved_at: Date | null;
  superseded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
