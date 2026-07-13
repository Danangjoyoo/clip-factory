import { describe, expect, it } from 'vitest';

import { makeYouTubeConnectionEntity } from '../../../../test-utils/youtube-publishing-builders';
import { YouTubeConnectionState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import { youtubeConnectionStatusEntityToApi } from './youtube-connection.converter';

describe('youtube connection API converter', () => {
  it('maps a connected status to the flat public API shape', () => {
    expect(
      youtubeConnectionStatusEntityToApi({
        connection: makeYouTubeConnectionEntity({
          refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
        }),
        status: YouTubeConnectionState.Connected,
        testingExpiryWarning:
          'Google OAuth Testing refresh tokens may expire in seven days.',
        workerAvailable: true,
      }),
    ).toEqual({
      id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
      channel: {
        id: 'UC-safe-channel',
        title: 'Clip Factory Test',
        handle: '@clipfactorytest',
        avatarUrl: null,
      },
      grantedScopes: ['https://www.googleapis.com/auth/youtube.upload'],
      status: 'CONNECTED',
      oauthMode: 'TESTING',
      refreshTokenExpiresAt: '2026-07-18T00:00:00.000Z',
      testingExpiryWarning:
        'Google OAuth Testing refresh tokens may expire in seven days.',
      revocationUncertain: false,
      workerAvailable: true,
    });
  });

  it('maps an empty status without fabricating channel identity', () => {
    expect(
      youtubeConnectionStatusEntityToApi({
        connection: null,
        status: YouTubeConnectionState.Disconnected,
        testingExpiryWarning: null,
        workerAvailable: false,
      }),
    ).toEqual({
      id: null,
      channel: null,
      grantedScopes: [],
      status: 'DISCONNECTED',
      oauthMode: 'UNKNOWN',
      refreshTokenExpiresAt: null,
      testingExpiryWarning: null,
      revocationUncertain: false,
      workerAvailable: false,
    });
  });
});
