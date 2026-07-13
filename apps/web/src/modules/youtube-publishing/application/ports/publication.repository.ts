import type { ProjectId, PublicationId } from '../../../../shared/domain';
import type {
  PublicationEntityDto,
  PublicationState,
} from '../dto/entity/youtube-publishing-entity.dto';

export type InsertPublicationEntityDto = Omit<
  PublicationEntityDto,
  'createdAt' | 'updatedAt'
>;

export type UpdatePublicationStateEntityDto = {
  publicationId: PublicationId;
  expectedState: PublicationState;
  nextState: PublicationState;
  thumbnailWarningCode: string | null;
  sanitizedErrorCode: string | null;
  sanitizedErrorMessage: string | null;
  updatedAt: Date;
};

export type AttachRemoteVideoEntityDto = {
  publicationId: PublicationId;
  youtubeVideoId: string;
  youtubeUrl: string;
  remoteVideoCreatedAt: Date;
};

export interface PublicationRepositoryPort {
  findById(id: PublicationId): Promise<PublicationEntityDto | null>;
  requireByIdForUpdate(id: PublicationId): Promise<PublicationEntityDto>;
  findByIdempotencyKey(key: string): Promise<PublicationEntityDto | null>;
  listByProject(projectId: ProjectId): Promise<readonly PublicationEntityDto[]>;
  insert(input: InsertPublicationEntityDto): Promise<PublicationEntityDto>;
  updateState(
    input: UpdatePublicationStateEntityDto,
  ): Promise<PublicationEntityDto | null>;
  attachRemoteVideo(
    input: AttachRemoteVideoEntityDto,
  ): Promise<PublicationEntityDto | null>;
}
