import { describe, expect, it, vi } from 'vitest';

import { makeYouTubeConnectionRecord } from '../../../../../test-utils/youtube-publishing-builders';
import { YouTubeConnectionState } from '../../../application/dto/entity/youtube-publishing-entity.dto';
import { PrismaYouTubeConnectionRepository } from './prisma-youtube-connection.repository';

const row = (overrides: Record<string, unknown> = {}) => {
  const record = makeYouTubeConnectionRecord();
  return {
    id: record.id,
    slot: record.slot,
    channelId: record.channel_id,
    channelTitle: record.channel_title,
    channelHandle: record.channel_handle,
    avatarUrl: record.avatar_url,
    grantedScopes: record.granted_scopes,
    state: record.state,
    oauthMode: record.oauth_mode,
    refreshTokenExpiresAt: record.refresh_token_expires_at,
    healthCheckedAt: record.health_checked_at,
    connectedAt: record.connected_at,
    disconnectedAt: record.disconnected_at,
    revocationUncertain: record.revocation_uncertain,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    ...overrides,
  };
};

describe('PrismaYouTubeConnectionRepository stale connection events', () => {
  it('returns updated requested connection when primary slot is concurrently replaced', async () => {
    const old = row({ state: 'REAUTH_REQUIRED' });
    const database = {
      youTubeConnection: {
        update: vi.fn().mockResolvedValue(old),
        findUnique: vi.fn().mockResolvedValue(row({ id: 'replacement-id' })),
      },
    };
    const repository = new PrismaYouTubeConnectionRepository(database as never);

    await expect(
      repository.updateState(
        old.id as never,
        YouTubeConnectionState.ReauthRequired,
      ),
    ).resolves.toMatchObject({
      id: old.id,
      state: YouTubeConnectionState.ReauthRequired,
    });
    expect(database.youTubeConnection.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for stale disconnect event instead of mutating replacement', async () => {
    const database = {
      youTubeConnection: {
        update: vi.fn().mockRejectedValue({ code: 'P2025' }),
        findUnique: vi.fn().mockResolvedValue(row({ id: 'replacement-id' })),
      },
    };
    const repository = new PrismaYouTubeConnectionRepository(database as never);

    await expect(repository.disconnect('stale-id' as never, true)).resolves.toBeNull();
    expect(database.youTubeConnection.findUnique).not.toHaveBeenCalled();
  });
});
