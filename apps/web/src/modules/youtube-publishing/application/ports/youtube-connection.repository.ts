import type {
  YouTubeConnectionEntityDto,
  YouTubeConnectionId,
  YouTubeConnectionState,
} from '../dto/entity/youtube-publishing-entity.dto';

export type ConnectedChannelInput = Omit<
  YouTubeConnectionEntityDto,
  | 'state'
  | 'connectedAt'
  | 'disconnectedAt'
  | 'revocationUncertain'
  | 'createdAt'
  | 'updatedAt'
>;

export interface YouTubeConnectionRepositoryPort {
  findPrimary(): Promise<YouTubeConnectionEntityDto | null>;
  upsertConnected(
    input: ConnectedChannelInput,
  ): Promise<YouTubeConnectionEntityDto>;
  updateState(
    id: YouTubeConnectionId,
    state: YouTubeConnectionState,
  ): Promise<YouTubeConnectionEntityDto | null>;
  disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto | null>;
}
