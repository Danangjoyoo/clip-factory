import { prisma } from '../../../../../infrastructure/prisma/client';
import type {
  Prisma,
  PrismaClient,
  YouTubeConnection,
} from '../../../../../generated/prisma/client';
import type {
  ConnectedChannelInput,
  YouTubeConnectionRepositoryPort,
} from '../../../application/ports/youtube-connection.repository';
import type {
  YouTubeConnectionEntityDto,
  YouTubeConnectionId,
  YouTubeConnectionState,
} from '../../../application/dto/entity/youtube-publishing-entity.dto';
import { connectionRecordToEntity } from '../../../converters/entity-record/youtube-connection.converter';
import type { YouTubeConnectionRecordDto } from '../dto/record/youtube-connection-record.dto';

type ConnectionDatabase = Pick<PrismaClient, 'youTubeConnection'>;

const select = {
  id: true,
  slot: true,
  channelId: true,
  channelTitle: true,
  channelHandle: true,
  avatarUrl: true,
  grantedScopes: true,
  state: true,
  oauthMode: true,
  refreshTokenExpiresAt: true,
  healthCheckedAt: true,
  connectedAt: true,
  disconnectedAt: true,
  revocationUncertain: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.YouTubeConnectionSelect;

const scopes = (value: unknown): readonly string[] => {
  if (Array.isArray(value) && value.every((scope) => typeof scope === 'string'))
    return value;
  throw new Error('youtube connection granted scopes must be a string array');
};

const record = (row: YouTubeConnection): YouTubeConnectionRecordDto => ({
  id: row.id,
  slot: row.slot as 'PRIMARY',
  channel_id: row.channelId,
  channel_title: row.channelTitle,
  channel_handle: row.channelHandle,
  avatar_url: row.avatarUrl,
  granted_scopes: scopes(row.grantedScopes),
  state: row.state as YouTubeConnectionRecordDto['state'],
  oauth_mode: row.oauthMode as YouTubeConnectionRecordDto['oauth_mode'],
  refresh_token_expires_at: row.refreshTokenExpiresAt,
  health_checked_at: row.healthCheckedAt,
  connected_at: row.connectedAt,
  disconnected_at: row.disconnectedAt,
  revocation_uncertain: row.revocationUncertain,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

export class PrismaYouTubeConnectionRepository implements YouTubeConnectionRepositoryPort {
  constructor(private readonly database: ConnectionDatabase = prisma) {}

  async findPrimary(): Promise<YouTubeConnectionEntityDto | null> {
    const row = await this.database.youTubeConnection.findUnique({
      where: { slot: 'PRIMARY' },
      select,
    });
    return row ? connectionRecordToEntity(record(row)) : null;
  }

  async upsertConnected(
    input: ConnectedChannelInput,
  ): Promise<YouTubeConnectionEntityDto> {
    const now = new Date();
    const values = {
      id: input.id,
      channelId: input.channelId,
      channelTitle: input.channelTitle,
      channelHandle: input.channelHandle,
      avatarUrl: input.avatarUrl,
      grantedScopes: [...input.grantedScopes],
      state: 'CONNECTED',
      oauthMode: input.oauthMode,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      healthCheckedAt: input.healthCheckedAt,
      connectedAt: now,
      disconnectedAt: null,
      revocationUncertain: false,
    };
    const row = await this.database.youTubeConnection.upsert({
      where: { slot: 'PRIMARY' },
      create: { slot: 'PRIMARY', ...values },
      update: values,
      select,
    });
    return connectionRecordToEntity(record(row));
  }

  async updateState(
    id: YouTubeConnectionId,
    state: YouTubeConnectionState,
  ): Promise<YouTubeConnectionEntityDto | null> {
    try {
      const row = await this.database.youTubeConnection.update({
        where: { id },
        data: { state },
        select,
      });
      return connectionRecordToEntity(record(row));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return null;
      throw error;
    }
  }

  async disconnect(
    id: YouTubeConnectionId,
    revocationUncertain: boolean,
  ): Promise<YouTubeConnectionEntityDto | null> {
    try {
      const row = await this.database.youTubeConnection.update({
        where: { id },
        data: {
          state: 'DISCONNECTED',
          disconnectedAt: new Date(),
          revocationUncertain,
        },
        select,
      });
      return connectionRecordToEntity(record(row));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return null;
      throw error;
    }
  }
}
