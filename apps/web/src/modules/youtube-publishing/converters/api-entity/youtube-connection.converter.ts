import type { YouTubeConnectionEventV1 } from '@clip-factory/contracts';

import type { YouTubeConnectionId } from '../../../../shared/domain';
import type {
  YouTubeConnectionStartEntityDto,
  YouTubeConnectionStatusEntityDto,
  YouTubeConnectionWorkerEventEntity,
} from '../../application/services/manage-youtube-connection.service';
import type { YouTubeConnectionApiDto } from '../../delivery/http/dto/api/youtube-connection-api.dto';

export function youtubeConnectionStartEntityToApi(
  value: YouTubeConnectionStartEntityDto,
): { connectionId: string; workflowId: string } {
  return {
    connectionId: value.connectionId,
    workflowId: value.workflowId,
  };
}

export function youtubeConnectionStatusEntityToApi(
  value: YouTubeConnectionStatusEntityDto,
): YouTubeConnectionApiDto {
  const connection = value.connection;
  if (connection === null) {
    return {
      id: null,
      channel: null,
      grantedScopes: [],
      status: value.status,
      oauthMode: 'UNKNOWN',
      refreshTokenExpiresAt: null,
      testingExpiryWarning: value.testingExpiryWarning,
      revocationUncertain: false,
      workerAvailable: value.workerAvailable,
    };
  }
  return {
    id: connection.id,
    channel: {
      id: connection.channelId,
      title: connection.channelTitle,
      handle: connection.channelHandle,
      avatarUrl: connection.avatarUrl,
    },
    grantedScopes: connection.grantedScopes,
    status: value.status,
    oauthMode: connection.oauthMode,
    refreshTokenExpiresAt: connection.refreshTokenExpiresAt?.toISOString() ?? null,
    testingExpiryWarning: value.testingExpiryWarning,
    revocationUncertain: connection.revocationUncertain,
    workerAvailable: value.workerAvailable,
  };
}

export function connectionEventContractToEntity(
  event: YouTubeConnectionEventV1,
): YouTubeConnectionWorkerEventEntity {
  switch (event.type) {
    case 'CONNECTED':
      return {
        type: 'CONNECTED',
        connection: {
          id: event.connectionId as YouTubeConnectionId,
          channelId: event.channelId,
          channelTitle: event.channelTitle,
          channelHandle: event.channelHandle,
          avatarUrl: event.avatarUrl,
          grantedScopes: event.grantedScopes,
          oauthMode: event.oauthMode,
          refreshTokenExpiresAt:
            event.refreshTokenExpiresAt === null
              ? null
              : new Date(event.refreshTokenExpiresAt),
          healthCheckedAt: new Date(),
        },
      };
    case 'REAUTH_REQUIRED':
      return {
        type: 'REAUTH_REQUIRED',
        connectionId: event.connectionId as YouTubeConnectionId,
        reasonCode: event.reasonCode,
      };
    case 'DISCONNECTED':
      return {
        type: 'DISCONNECTED',
        connectionId: event.connectionId as YouTubeConnectionId,
        revocationUncertain: event.revocationUncertain,
      };
    case 'FAILED':
      return {
        type: 'FAILED',
        connectionId: event.connectionId as YouTubeConnectionId,
        reasonCode: event.reasonCode,
      };
  }
}
