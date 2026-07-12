import {
  type AIUsageEventId,
  type ClipId,
  type ProjectId,
  type PublishingMetadataDraftId,
} from '../../../../shared/domain';
import {
  MetadataDraftState,
  type PublishingMetadataDraftEntityDto,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import { parsePublishingMetadata } from '../../domain/publishing-metadata';
import type {
  PublishingMetadataDraftRecordDto,
  PublishingMetadataDraftRecordState,
} from '../../adapters/persistence/dto/record/publishing-metadata-draft-record.dto';

const states: Readonly<
  Record<PublishingMetadataDraftRecordState, MetadataDraftState>
> = {
  METADATA_DRAFT: MetadataDraftState.Draft,
  AWAITING_APPROVAL: MetadataDraftState.AwaitingApproval,
  APPROVED: MetadataDraftState.Approved,
  SUPERSEDED: MetadataDraftState.Superseded,
};

const recordStates: Readonly<
  Record<MetadataDraftState, PublishingMetadataDraftRecordState>
> = {
  [MetadataDraftState.Empty]: 'METADATA_DRAFT',
  [MetadataDraftState.Draft]: 'METADATA_DRAFT',
  [MetadataDraftState.AwaitingApproval]: 'AWAITING_APPROVAL',
  [MetadataDraftState.Approved]: 'APPROVED',
  [MetadataDraftState.Superseded]: 'SUPERSEDED',
};

const uuid = (value: string, name: string): string => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new Error(`${name} must be a UUID`);
  }
  return value;
};

function parseStringArray(
  value: unknown,
  field: 'hashtags' | 'keywordTags',
): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be a string array`);
  }
  return Object.freeze([...value]);
}

export function metadataDraftRecordToEntity(
  record: PublishingMetadataDraftRecordDto,
): PublishingMetadataDraftEntityDto {
  const state = states[record.state];
  if (!state)
    throw new Error(`unknown publishing metadata draft state ${record.state}`);
  if (record.source !== 'MANUAL' && record.source !== 'OPENAI') {
    throw new Error(
      `unknown publishing metadata draft source ${record.source}`,
    );
  }
  return Object.freeze({
    id: uuid(record.id, 'id') as PublishingMetadataDraftId,
    projectId: uuid(record.project_id, 'projectId') as ProjectId,
    clipId: uuid(record.clip_id, 'clipId') as ClipId,
    version: record.version,
    revision: record.revision,
    state,
    source: record.source,
    metadata: parsePublishingMetadata({
      title: record.title,
      description: record.description,
      hashtags: parseStringArray(record.hashtags, 'hashtags'),
      keywordTags: parseStringArray(record.keyword_tags, 'keywordTags'),
      categoryId: record.category_id,
      defaultLanguage: record.default_language,
      madeForKids: record.made_for_kids,
      containsSyntheticMedia: record.contains_synthetic_media,
    }),
    publishingInstruction: record.publishing_instruction,
    modelId: record.model_id,
    reasoningLevel: record.reasoning_level,
    maxCostMicrousd: record.max_cost_microusd,
    estimatedCostMicrousd: record.estimated_cost_microusd,
    actualCostMicrousd: record.actual_cost_microusd,
    aiUsageEventId: record.ai_usage_event_id
      ? (uuid(record.ai_usage_event_id, 'aiUsageEventId') as AIUsageEventId)
      : null,
    approvedAt: record.approved_at,
    supersededAt: record.superseded_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  });
}

export function metadataDraftEntityToRecord(
  entity: Omit<PublishingMetadataDraftEntityDto, 'createdAt' | 'updatedAt'>,
): Omit<PublishingMetadataDraftRecordDto, 'created_at' | 'updated_at'> {
  const state = recordStates[entity.state];
  if (!state || entity.state === MetadataDraftState.Empty)
    throw new Error(`unknown metadata draft state ${entity.state}`);
  return {
    id: entity.id,
    project_id: entity.projectId,
    clip_id: entity.clipId,
    version: entity.version,
    revision: entity.revision,
    state,
    source: entity.source,
    title: entity.metadata.title,
    description: entity.metadata.description,
    hashtags: [...entity.metadata.hashtags],
    keyword_tags: [...entity.metadata.keywordTags],
    category_id: entity.metadata.categoryId,
    default_language: entity.metadata.defaultLanguage,
    made_for_kids: entity.metadata.madeForKids,
    contains_synthetic_media: entity.metadata.containsSyntheticMedia,
    publishing_instruction: entity.publishingInstruction,
    model_id: entity.modelId,
    reasoning_level: entity.reasoningLevel,
    max_cost_microusd: entity.maxCostMicrousd,
    estimated_cost_microusd: entity.estimatedCostMicrousd,
    actual_cost_microusd: entity.actualCostMicrousd,
    ai_usage_event_id: entity.aiUsageEventId,
    approved_at: entity.approvedAt,
    superseded_at: entity.supersededAt,
  };
}
