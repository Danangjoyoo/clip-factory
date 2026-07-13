import type {
  ClipId,
  PublishingMetadataDraftId,
} from '../../../../shared/domain';
import type {
  MetadataDraftState,
  PublishingMetadataDraftEntityDto,
  PublishingMetadataEntityDto,
} from '../dto/entity/youtube-publishing-entity.dto';

export type InsertPublishingMetadataDraftEntityDto = Omit<
  PublishingMetadataDraftEntityDto,
  'createdAt' | 'updatedAt'
>;

export interface PublishingMetadataDraftRepositoryPort {
  findById(
    id: PublishingMetadataDraftId,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
  findLatestForClip(
    clipId: ClipId,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
  listForClip(
    clipId: ClipId,
  ): Promise<readonly PublishingMetadataDraftEntityDto[]>;
  insertVersion(
    input: InsertPublishingMetadataDraftEntityDto,
  ): Promise<PublishingMetadataDraftEntityDto>;
  updateEditableRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    metadata: PublishingMetadataEntityDto,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
  updateStateRevision(
    id: PublishingMetadataDraftId,
    expectedRevision: number,
    state: MetadataDraftState,
    approvedAt: Date | null,
  ): Promise<PublishingMetadataDraftEntityDto | null>;
}
