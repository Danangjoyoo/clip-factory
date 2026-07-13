import type { YouTubeConnectionApiDto } from '../http/dto/api/youtube-connection-api.dto';

export type YouTubeConnectionVmStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'REAUTH_REQUIRED';

export type YouTubeConnectionVm = {
  status: YouTubeConnectionVmStatus;
  statusLabel: string;
  workerAvailable: boolean;
  channelTitle: string | null;
  channelHandle: string | null;
  testingExpiryWarning: string | null;
  revocationUncertain: boolean;
};

export function youtubeConnectionApiToVm(
  connection: YouTubeConnectionApiDto,
): YouTubeConnectionVm {
  return {
    status: connection.status,
    statusLabel: statusLabels[connection.status],
    workerAvailable: connection.workerAvailable,
    channelTitle: connection.channel?.title ?? null,
    channelHandle: connection.channel?.handle ?? null,
    testingExpiryWarning: connection.testingExpiryWarning,
    revocationUncertain: connection.revocationUncertain,
  };
}

const statusLabels: Record<YouTubeConnectionVmStatus, string> = {
  DISCONNECTED: 'YouTube disconnected',
  CONNECTING: 'Connecting to YouTube',
  CONNECTED: 'YouTube connected',
  REAUTH_REQUIRED: 'Reconnect required',
};
