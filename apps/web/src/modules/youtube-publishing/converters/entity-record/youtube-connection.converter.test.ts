import { describe, expect, it } from 'vitest';

import { makeYouTubeConnectionRecord } from '../../../../test-utils/youtube-publishing-builders';
import { YouTubeConnectionState } from '../../application/dto/entity/youtube-publishing-entity.dto';
import {
  connectionEntityToRecord,
  connectionRecordToEntity,
} from './youtube-connection.converter';

describe('YouTube connection converter', () => {
  it('maps enum, nullability, scopes, and UTC timestamps explicitly', () => {
    const record = makeYouTubeConnectionRecord({
      channel_handle: null,
      avatar_url: null,
      state: 'REAUTH_REQUIRED',
      refresh_token_expires_at: new Date('2026-07-18T00:00:00.000Z'),
    });

    expect(connectionRecordToEntity(record)).toMatchObject({
      id: record.id,
      channelId: 'UC-safe-channel',
      channelHandle: null,
      state: YouTubeConnectionState.ReauthRequired,
      oauthMode: 'TESTING',
      refreshTokenExpiresAt: record.refresh_token_expires_at,
    });
  });

  it('rejects an unknown persisted state', () => {
    expect(() =>
      connectionRecordToEntity(
        makeYouTubeConnectionRecord({ state: 'TOKEN_EXPIRED' as never }),
      ),
    ).toThrow('unknown YouTube connection record state TOKEN_EXPIRED');
  });

  it.each([
    [YouTubeConnectionState.Disconnected, 'DISCONNECTED'],
    [YouTubeConnectionState.Connected, 'CONNECTED'],
    [YouTubeConnectionState.ReauthRequired, 'REAUTH_REQUIRED'],
  ] as const)(
    'maps Entity state %s to Record state %s',
    (entityState, recordState) => {
      const entity = connectionRecordToEntity(
        makeYouTubeConnectionRecord({ state: recordState }),
      );
      const converted = connectionEntityToRecord({
        ...entity,
        state: entityState,
      });
      expect(converted.state).toBe(recordState);
      expect(converted.granted_scopes).toEqual(entity.grantedScopes);
      expect(converted.granted_scopes).not.toBe(entity.grantedScopes);
    },
  );
});
