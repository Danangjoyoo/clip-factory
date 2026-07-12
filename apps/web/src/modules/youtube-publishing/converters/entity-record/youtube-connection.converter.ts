import type {
  YouTubeConnectionEntityDto,
  YouTubeConnectionId,
} from '../../application/dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import type {
  YouTubeConnectionRecordDto,
  YouTubeConnectionRecordState,
} from '../../adapters/persistence/dto/record/youtube-connection-record.dto';

const entityStates: Readonly<
  Record<YouTubeConnectionRecordState, YouTubeConnectionState>
> = {
  DISCONNECTED: YouTubeConnectionState.Disconnected,
  CONNECTED: YouTubeConnectionState.Connected,
  REAUTH_REQUIRED: YouTubeConnectionState.ReauthRequired,
};

const recordStates: Readonly<
  Record<YouTubeConnectionState, YouTubeConnectionRecordState>
> = {
  [YouTubeConnectionState.Disconnected]: 'DISCONNECTED',
  [YouTubeConnectionState.Connected]: 'CONNECTED',
  [YouTubeConnectionState.ReauthRequired]: 'REAUTH_REQUIRED',
};

export const connectionRecordToEntity = (
  record: YouTubeConnectionRecordDto,
): YouTubeConnectionEntityDto => {
  const state = entityStates[record.state];
  if (!state)
    throw new Error(`unknown YouTube connection record state ${record.state}`);
  return {
    id: record.id as YouTubeConnectionId,
    channelId: record.channel_id,
    channelTitle: record.channel_title,
    channelHandle: record.channel_handle,
    avatarUrl: record.avatar_url,
    grantedScopes: Object.freeze([...record.granted_scopes]),
    state,
    oauthMode: record.oauth_mode,
    refreshTokenExpiresAt: record.refresh_token_expires_at,
    healthCheckedAt: record.health_checked_at,
    connectedAt: record.connected_at,
    disconnectedAt: record.disconnected_at,
    revocationUncertain: record.revocation_uncertain,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

export const connectionEntityToRecord = (
  entity: YouTubeConnectionEntityDto,
): YouTubeConnectionRecordDto => ({
  id: entity.id,
  slot: 'PRIMARY',
  channel_id: entity.channelId,
  channel_title: entity.channelTitle,
  channel_handle: entity.channelHandle,
  avatar_url: entity.avatarUrl,
  granted_scopes: Object.freeze([...entity.grantedScopes]),
  state: recordStates[entity.state],
  oauth_mode: entity.oauthMode,
  refresh_token_expires_at: entity.refreshTokenExpiresAt,
  health_checked_at: entity.healthCheckedAt,
  connected_at: entity.connectedAt,
  disconnected_at: entity.disconnectedAt,
  revocation_uncertain: entity.revocationUncertain,
  created_at: entity.createdAt,
  updated_at: entity.updatedAt,
});
