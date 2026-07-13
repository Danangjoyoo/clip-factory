import { Prisma, PrismaClient } from '../../../../../generated/prisma/client';
import type {
  PublishingMetadataDraftId,
  ClipId,
} from '../../../../../shared/domain';
import type {
  PublishingMetadataDraftRepositoryPort,
  InsertPublishingMetadataDraftEntityDto,
} from '../../../application/ports/publishing-metadata-draft.repository';
import type {
  MetadataDraftState,
  PublishingMetadataEntityDto,
} from '../../../application/dto/entity/youtube-publishing-entity.dto';
import { MetadataDraftState as State } from '../../../application/dto/entity/youtube-publishing-entity.dto';
import {
  metadataDraftEntityToRecord,
  metadataDraftRecordToEntity,
} from '../../../converters/entity-record/publishing-metadata-draft.converter';
import type { PublishingMetadataDraftRecordDto } from '../dto/record/publishing-metadata-draft-record.dto';

type Row = Awaited<
  ReturnType<PrismaClient['publishingMetadataDraft']['findFirst']>
>;

const stateToRecord = (
  state: MetadataDraftState,
): PublishingMetadataDraftRecordDto['state'] => {
  if (state === State.Draft) return 'METADATA_DRAFT';
  if (state === State.AwaitingApproval) return 'AWAITING_APPROVAL';
  if (state === State.Approved) return 'APPROVED';
  if (state === State.Superseded) return 'SUPERSEDED';
  throw new Error(`metadata draft state ${state} cannot persist`);
};

const record = (row: NonNullable<Row>): PublishingMetadataDraftRecordDto => ({
  id: row.id,
  project_id: row.projectId,
  clip_id: row.clipId,
  version: row.version,
  revision: row.revision,
  state: row.state as PublishingMetadataDraftRecordDto['state'],
  source: row.source as PublishingMetadataDraftRecordDto['source'],
  title: row.title,
  description: row.description,
  hashtags: row.hashtags,
  keyword_tags: row.keywordTags,
  category_id: row.categoryId,
  default_language: row.defaultLanguage,
  made_for_kids: row.madeForKids,
  contains_synthetic_media: row.containsSyntheticMedia,
  publishing_instruction: row.publishingInstruction,
  model_id: row.modelId,
  reasoning_level: row.reasoningLevel,
  max_cost_microusd: row.maxCostMicrousd,
  estimated_cost_microusd: row.estimatedCostMicrousd,
  actual_cost_microusd: row.actualCostMicrousd,
  ai_usage_event_id: row.aiUsageEventId,
  approved_at: row.approvedAt,
  superseded_at: row.supersededAt,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

export class PrismaPublishingMetadataDraftRepository implements PublishingMetadataDraftRepositoryPort {
  constructor(private readonly database: PrismaClient) {}

  async findById(id: PublishingMetadataDraftId) {
    const row = await this.database.publishingMetadataDraft.findUnique({
      where: { id },
    });
    return row ? metadataDraftRecordToEntity(record(row)) : null;
  }

  async findLatestForClip(clipId: ClipId) {
    const row = await this.database.publishingMetadataDraft.findFirst({
      where: { clipId },
      orderBy: { version: 'desc' },
    });
    return row ? metadataDraftRecordToEntity(record(row)) : null;
  }

  async listForClip(clipId: ClipId) {
    const rows = await this.database.publishingMetadataDraft.findMany({
      where: { clipId },
      orderBy: { version: 'asc' },
    });
    return rows.map((row) => metadataDraftRecordToEntity(record(row)));
  }

  async insertVersion(input: InsertPublishingMetadataDraftEntityDto) {
    const value = metadataDraftEntityToRecord(input);
    const row = await this.database.publishingMetadataDraft.create({
      data: {
        id: value.id,
        projectId: value.project_id,
        clipId: value.clip_id,
        version: value.version,
        revision: value.revision,
        state: value.state,
        source: value.source,
        title: value.title,
        description: value.description,
        hashtags: value.hashtags as Prisma.InputJsonValue,
        keywordTags: value.keyword_tags as Prisma.InputJsonValue,
        categoryId: value.category_id,
        defaultLanguage: value.default_language,
        madeForKids: value.made_for_kids,
        containsSyntheticMedia: value.contains_synthetic_media,
        publishingInstruction: value.publishing_instruction,
        modelId: value.model_id,
        reasoningLevel: value.reasoning_level,
        maxCostMicrousd: value.max_cost_microusd,
        estimatedCostMicrousd: value.estimated_cost_microusd,
        actualCostMicrousd: value.actual_cost_microusd,
        aiUsageEventId: value.ai_usage_event_id,
        approvedAt: value.approved_at,
        supersededAt: value.superseded_at,
      },
    });
    return metadataDraftRecordToEntity(record(row));
  }

  async updateEditableRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    metadata: PublishingMetadataEntityDto,
  ) {
    const result = await this.database.publishingMetadataDraft.updateMany({
      where: { id, revision: expectedRevision },
      data: {
        title: metadata.title,
        description: metadata.description,
        hashtags: [...metadata.hashtags] as Prisma.InputJsonValue,
        keywordTags: [...metadata.keywordTags] as Prisma.InputJsonValue,
        categoryId: metadata.categoryId,
        defaultLanguage: metadata.defaultLanguage,
        madeForKids: metadata.madeForKids,
        containsSyntheticMedia: metadata.containsSyntheticMedia,
        revision: { increment: 1 },
      },
    });
    return result.count === 1 ? this.findById(id) : null;
  }

  async updateStateRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    state: MetadataDraftState,
    approvedAt: Date | null,
  ) {
    const result = await this.database.publishingMetadataDraft.updateMany({
      where: { id, revision: expectedRevision },
      data: {
        state: stateToRecord(state),
        approvedAt,
        revision: { increment: 1 },
      },
    });
    return result.count === 1 ? this.findById(id) : null;
  }
}
