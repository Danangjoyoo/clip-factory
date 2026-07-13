import { expect, it, vi } from 'vitest';

import { makeYouTubeConnectionEntity } from '../../../../test-utils/youtube-publishing-builders';
import { YouTubeConnectionState } from '../dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionDataService } from './youtube-connection.data-service';

it('marks invalid_grant as reauth required without deleting channel history', async () => {
  const connection = makeYouTubeConnectionEntity({
    state: YouTubeConnectionState.Connected,
  });
  const repository = {
    findPrimary: vi.fn(),
    upsertConnected: vi.fn(),
    updateState: vi.fn().mockResolvedValue({
      ...connection,
      state: YouTubeConnectionState.ReauthRequired,
    }),
    disconnect: vi.fn(),
  };
  const service = new YouTubeConnectionDataService(repository);

  await expect(
    service.markReauthRequired(connection.id),
  ).resolves.toMatchObject({
    channelId: connection.channelId,
    state: YouTubeConnectionState.ReauthRequired,
  });
  expect(repository.updateState).toHaveBeenCalledWith(
    connection.id,
    YouTubeConnectionState.ReauthRequired,
  );
});

it('throws when state change has no persisted connection', async () => {
  const connection = makeYouTubeConnectionEntity();
  const service = new YouTubeConnectionDataService({
    findPrimary: vi.fn(),
    upsertConnected: vi.fn(),
    updateState: vi.fn().mockResolvedValue(null),
    disconnect: vi.fn(),
  });

  await expect(service.markReauthRequired(connection.id)).rejects.toThrow(
    'YouTube connection not found',
  );
});
