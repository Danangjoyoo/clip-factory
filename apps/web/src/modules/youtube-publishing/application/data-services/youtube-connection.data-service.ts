import type {
  YouTubeConnectionEntityDto,
  YouTubeConnectionId,
} from '../dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionState } from '../dto/entity/youtube-publishing-entity.dto';
import type {
  ConnectedChannelInput,
  YouTubeConnectionRepositoryPort,
} from '../ports/youtube-connection.repository';

export class YouTubeConnectionNotFoundDataError extends Error {
  constructor(id: YouTubeConnectionId) {
    super(`YouTube connection not found: ${id}`);
  }
}

export interface YouTubeConnectionDataServiceContract {
  getPrimary(): Promise<YouTubeConnectionEntityDto | null>;
  saveConnected(input: ConnectedChannelInput): Promise<YouTubeConnectionEntityDto>;
  markReauthRequired(id: YouTubeConnectionId): Promise<YouTubeConnectionEntityDto>;
  disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto>;
}

export class YouTubeConnectionDataService
  implements YouTubeConnectionDataServiceContract
{
  constructor(
    private readonly repository: Pick<
      YouTubeConnectionRepositoryPort,
      'findPrimary' | 'upsertConnected' | 'updateState' | 'disconnect'
    >,
  ) {}

  getPrimary(): Promise<YouTubeConnectionEntityDto | null> {
    return this.repository.findPrimary();
  }

  saveConnected(
    input: ConnectedChannelInput,
  ): Promise<YouTubeConnectionEntityDto> {
    return this.repository.upsertConnected(input);
  }

  async markReauthRequired(
    id: YouTubeConnectionId,
  ): Promise<YouTubeConnectionEntityDto> {
    const connection = await this.repository.updateState(
      id,
      YouTubeConnectionState.ReauthRequired,
    );
    if (!connection) throw new YouTubeConnectionNotFoundDataError(id);
    return connection;
  }

  async disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto> {
    const connection = await this.repository.disconnect(
      id,
      revocationUncertain,
    );
    if (!connection) throw new YouTubeConnectionNotFoundDataError(id);
    return connection;
  }
}
