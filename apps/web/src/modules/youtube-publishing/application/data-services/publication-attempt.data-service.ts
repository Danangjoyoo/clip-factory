import type {
  PublicationAttemptId,
  PublicationId,
} from '../../../../shared/domain';
import type { PublicationAttemptEntityDto } from '../dto/entity/youtube-publishing-entity.dto';
import type {
  FinishAttemptEntityDto,
  InsertPublicationAttemptEntityDto,
  PublicationAttemptRepositoryPort,
  SaveAttemptProgressEntityDto,
} from '../ports/publication-attempt.repository';

export class PublicationAttemptNotFoundDataError extends Error {
  readonly code = 'PUBLICATION_ATTEMPT_NOT_FOUND';
  constructor(id: PublicationAttemptId | PublicationId) {
    super(`publication attempt not found: ${id}`);
  }
}

export class PublicationAttemptDataService {
  constructor(private readonly repository: PublicationAttemptRepositoryPort) {}

  findById(
    id: PublicationAttemptId,
  ): Promise<PublicationAttemptEntityDto | null> {
    return this.repository.findById(id);
  }

  requireCurrentForUpdate(
    publicationId: PublicationId,
  ): Promise<PublicationAttemptEntityDto> {
    return this.repository.requireCurrentForUpdate(publicationId);
  }

  listByPublication(
    publicationId: PublicationId,
  ): Promise<readonly PublicationAttemptEntityDto[]> {
    return this.repository.listByPublication(publicationId);
  }

  insert(
    input: InsertPublicationAttemptEntityDto,
  ): Promise<PublicationAttemptEntityDto> {
    return this.repository.insert(input);
  }

  async saveProgress(
    input: SaveAttemptProgressEntityDto,
  ): Promise<PublicationAttemptEntityDto> {
    const attempt = await this.repository.saveProgress(input);
    if (!attempt) throw new PublicationAttemptNotFoundDataError(input.id);
    return attempt;
  }

  async finish(
    input: FinishAttemptEntityDto,
  ): Promise<PublicationAttemptEntityDto> {
    const attempt = await this.repository.finish(input);
    if (!attempt) throw new PublicationAttemptNotFoundDataError(input.id);
    return attempt;
  }
}
