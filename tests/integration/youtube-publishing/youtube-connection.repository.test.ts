import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaYouTubeConnectionRepository } from '../../../apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-youtube-connection.repository';
import { YouTubeConnectionState } from '../../../apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto';
import {
  makePrismaTestClient,
  resetDatabase,
} from '../support/prisma-test-client';
import { integrationEnabled } from '../support/test-environment';

describe.skipIf(!integrationEnabled)(
  'PrismaYouTubeConnectionRepository',
  () => {
    let prisma: Awaited<ReturnType<typeof makePrismaTestClient>>;
    let repository: PrismaYouTubeConnectionRepository;

    beforeAll(async () => {
      prisma = await makePrismaTestClient();
      await resetDatabase();
      await prisma.youTubeConnection.deleteMany();
      repository = new PrismaYouTubeConnectionRepository(prisma);
    });
    afterAll(() => prisma.$disconnect());

    it('persists only nonsecret channel metadata in primary slot', async () => {
      const connected = await repository.upsertConnected({
        id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42' as never,
        channelId: 'UC-safe-channel',
        channelTitle: 'Clip Factory Test',
        channelHandle: '@clipfactorytest',
        avatarUrl: 'https://yt3.ggpht.com/safe-avatar',
        grantedScopes: [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly',
        ],
        oauthMode: 'TESTING',
        refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
        healthCheckedAt: new Date('2026-07-11T00:00:00.000Z'),
      });

      await expect(repository.findPrimary()).resolves.toMatchObject({
        channelId: 'UC-safe-channel',
        state: YouTubeConnectionState.Connected,
        refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
      });
      await expect(
        repository.disconnect(connected.id, true),
      ).resolves.toMatchObject({
        state: YouTubeConnectionState.Disconnected,
        revocationUncertain: true,
      });
    });

    it('has no credential-shaped columns', async () => {
      const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'youtube_connections'
    `;
      expect(rows.map((row) => row.column_name)).not.toEqual(
        expect.arrayContaining([
          'access_token',
          'refresh_token',
          'authorization_code',
          'code_verifier',
          'client_secret',
        ]),
      );
    });

    it('allows only one primary slot', async () => {
      await expect(
        prisma.youTubeConnection.create({
          data: {
            id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb47',
            slot: 'PRIMARY',
            channelId: 'UC-other',
            channelTitle: 'Other',
            grantedScopes: [],
            state: 'CONNECTED',
            oauthMode: 'UNKNOWN',
          },
        }),
      ).rejects.toThrow();
    });
  },
);
