import { describe, expect, it } from 'vitest';

import type { YouTubeConnectionApiDto } from '../http/dto/api/youtube-connection-api.dto';
import { youtubeConnectionApiToVm } from './youtube-connection.vm';

describe('youtubeConnectionApiToVm', () => {
  it('maps a connected API DTO to presentation-ready labels', () => {
    expect(
      youtubeConnectionApiToVm({
        id: 'connection-1',
        channel: {
          id: 'UC-safe-channel',
          title: 'Clip Factory Test',
          handle: '@clipfactorytest',
          avatarUrl: null,
        },
        grantedScopes: ['https://www.googleapis.com/auth/youtube.upload'],
        status: 'CONNECTED',
        oauthMode: 'TESTING',
        refreshTokenExpiresAt: '2026-07-20T00:00:00.000Z',
        testingExpiryWarning:
          'Google OAuth Testing refresh tokens may expire in seven days.',
        revocationUncertain: true,
        workerAvailable: true,
      } satisfies YouTubeConnectionApiDto),
    ).toEqual({
      status: 'CONNECTED',
      statusLabel: 'YouTube connected',
      workerAvailable: true,
      channelTitle: 'Clip Factory Test',
      channelHandle: '@clipfactorytest',
      testingExpiryWarning:
        'Google OAuth Testing refresh tokens may expire in seven days.',
      revocationUncertain: true,
    });
  });

  it('maps a disconnected API DTO without channel copy', () => {
    expect(
      youtubeConnectionApiToVm({
        id: null,
        channel: null,
        grantedScopes: [],
        status: 'DISCONNECTED',
        oauthMode: 'UNKNOWN',
        refreshTokenExpiresAt: null,
        testingExpiryWarning: null,
        revocationUncertain: false,
        workerAvailable: false,
      } satisfies YouTubeConnectionApiDto),
    ).toEqual({
      status: 'DISCONNECTED',
      statusLabel: 'YouTube disconnected',
      workerAvailable: false,
      channelTitle: null,
      channelHandle: null,
      testingExpiryWarning: null,
      revocationUncertain: false,
    });
  });
});
