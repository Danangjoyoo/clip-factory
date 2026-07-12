import type { YouTubeConnectionEntityDto } from '../modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionState } from '../modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto';
import type { YouTubeConnectionRecordDto } from '../modules/youtube-publishing/adapters/persistence/dto/record/youtube-connection-record.dto';

const id = '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42';
const now = new Date('2026-07-11T00:00:00.000Z');

export const makeYouTubeConnectionRecord = (
  overrides: Partial<YouTubeConnectionRecordDto> = {},
): YouTubeConnectionRecordDto => ({
  id,
  slot: 'PRIMARY',
  channel_id: 'UC-safe-channel',
  channel_title: 'Clip Factory Test',
  channel_handle: '@clipfactorytest',
  avatar_url: null,
  granted_scopes: ['https://www.googleapis.com/auth/youtube.upload'],
  state: 'CONNECTED',
  oauth_mode: 'TESTING',
  refresh_token_expires_at: null,
  health_checked_at: now,
  connected_at: now,
  disconnected_at: null,
  revocation_uncertain: false,
  created_at: now,
  updated_at: now,
  ...overrides,
});

export const makeYouTubeConnectionEntity = (
  overrides: Partial<YouTubeConnectionEntityDto> = {},
): YouTubeConnectionEntityDto => ({
  id: id as YouTubeConnectionEntityDto['id'],
  channelId: 'UC-safe-channel',
  channelTitle: 'Clip Factory Test',
  channelHandle: '@clipfactorytest',
  avatarUrl: null,
  grantedScopes: ['https://www.googleapis.com/auth/youtube.upload'],
  state: YouTubeConnectionState.Connected,
  oauthMode: 'TESTING',
  refreshTokenExpiresAt: null,
  healthCheckedAt: now,
  connectedAt: now,
  disconnectedAt: null,
  revocationUncertain: false,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});
