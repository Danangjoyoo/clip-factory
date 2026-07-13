import type { ProjectId, PublicationId } from '../../../../shared/domain';
import type { PublicationEntityDto } from '../dto/entity/youtube-publishing-entity.dto';
import type {
  AttachRemoteVideoEntityDto,
  InsertPublicationEntityDto,
  PublicationRepositoryPort,
  UpdatePublicationStateEntityDto,
} from '../ports/publication.repository';

export class PublicationNotFoundDataError extends Error {
  readonly code = 'PUBLICATION_NOT_FOUND';
  constructor(id: PublicationId) {
    super(`publication not found: ${id}`);
  }
}

export class PublicationDataService {
  constructor(private readonly repository: PublicationRepositoryPort) {}

  findById(id: PublicationId): Promise<PublicationEntityDto | null> {
    return this.repository.findById(id);
  }

  requireByIdForUpdate(id: PublicationId): Promise<PublicationEntityDto> {
    return this.repository.requireByIdForUpdate(id);
  }

  findByIdempotencyKey(key: string): Promise<PublicationEntityDto | null> {
    return this.repository.findByIdempotencyKey(key);
  }

  listByProject(
    projectId: ProjectId,
  ): Promise<readonly PublicationEntityDto[]> {
    return this.repository.listByProject(projectId);
  }

  insert(input: InsertPublicationEntityDto): Promise<PublicationEntityDto> {
    return this.repository.insert(input);
  }

  async updateState(
    input: UpdatePublicationStateEntityDto,
  ): Promise<PublicationEntityDto> {
    const publication = await this.repository.updateState(input);
    if (!publication)
      throw new PublicationNotFoundDataError(input.publicationId);
    return publication;
  }

  async attachRemoteVideo(
    input: AttachRemoteVideoEntityDto,
  ): Promise<PublicationEntityDto> {
    const publication = await this.repository.attachRemoteVideo(input);
    if (!publication)
      throw new PublicationNotFoundDataError(input.publicationId);
    return publication;
  }
}
