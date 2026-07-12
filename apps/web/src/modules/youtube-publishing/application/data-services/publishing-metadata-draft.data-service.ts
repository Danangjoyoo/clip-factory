import type {
  PublishingMetadataDraftId,
  ClipId,
} from '../../../../shared/domain';
import type {
  PublishingMetadataDraftEntityDto,
  PublishingMetadataEntityDto,
  MetadataDraftState,
} from '../dto/entity/youtube-publishing-entity.dto';
import type {
  PublishingMetadataDraftRepositoryPort,
  InsertPublishingMetadataDraftEntityDto,
} from '../ports/publishing-metadata-draft.repository';

export class MetadataDraftRevisionConflictDataError extends Error {
  readonly code = 'METADATA_DRAFT_REVISION_CONFLICT';
  constructor(id: PublishingMetadataDraftId, revision: number) {
    super(`metadata draft ${id} revision ${revision} conflicts`);
  }
}

export class PublishingMetadataDraftDataService {
  constructor(
    private readonly repository: PublishingMetadataDraftRepositoryPort,
  ) {}
  findById(id: PublishingMetadataDraftId) {
    return this.repository.findById(id);
  }
  findLatestForClip(clipId: ClipId) {
    return this.repository.findLatestForClip(clipId);
  }
  listForClip(clipId: ClipId) {
    return this.repository.listForClip(clipId);
  }
  insertVersion(input: InsertPublishingMetadataDraftEntityDto) {
    return this.repository.insertVersion(input);
  }
  async updateEditableRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    metadata: PublishingMetadataEntityDto,
  ): Promise<PublishingMetadataDraftEntityDto> {
    const result = await this.repository.updateEditableRevision(
      id,
      expectedRevision,
      metadata,
    );
    if (!result)
      throw new MetadataDraftRevisionConflictDataError(id, expectedRevision);
    return result;
  }
  async updateStateRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    state: MetadataDraftState,
    approvedAt: Date | null,
  ): Promise<PublishingMetadataDraftEntityDto> {
    const result = await this.repository.updateStateRevision(
      id,
      expectedRevision,
      state,
      approvedAt,
    );
    if (!result)
      throw new MetadataDraftRevisionConflictDataError(id, expectedRevision);
    return result;
  }
}
