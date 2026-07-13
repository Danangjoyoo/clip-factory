import type { WorkflowId, YouTubeConnectionId } from '../../../../shared/domain';
import type { YouTubeConnectionDataServiceContract } from '../data-services/youtube-connection.data-service';
import type { YouTubeConnectionEntityDto } from '../dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionState } from '../dto/entity/youtube-publishing-entity.dto';
import type {
  ConnectedChannelInput,
} from '../ports/youtube-connection.repository';
import type { YouTubeConnectionWorkflowScheduler } from '../ports/youtube-connection-workflow-scheduler';

export type YouTubeConnectionStartEntityDto = {
  connectionId: YouTubeConnectionId;
  workflowId: WorkflowId;
};

export type YouTubeConnectionStatusEntityDto = {
  connection: YouTubeConnectionEntityDto | null;
  status: YouTubeConnectionState;
  testingExpiryWarning: string | null;
  workerAvailable: boolean;
};

export type YouTubeConnectionWorkerEventEntity =
  | { type: 'CONNECTED'; connection: ConnectedChannelInput }
  | {
      type: 'REAUTH_REQUIRED';
      connectionId: YouTubeConnectionId;
      reasonCode: 'INVALID_GRANT';
    }
  | {
      type: 'DISCONNECTED';
      connectionId: YouTubeConnectionId;
      revocationUncertain: boolean;
    }
  | {
      type: 'FAILED';
      connectionId: YouTubeConnectionId;
      reasonCode:
        | 'CONSENT_DENIED'
        | 'STATE_MISMATCH'
        | 'STATE_EXPIRED'
        | 'MISSING_SCOPE'
        | 'CALLBACK_TIMEOUT'
        | 'GOOGLE_POLICY_DENIED';
    };

export interface WorkerAvailability {
  isAvailable(): Promise<boolean>;
}

export interface IdGenerator {
  randomId(): YouTubeConnectionId;
}

export class YouTubeWorkerOfflineError extends Error {
  readonly code = 'YOUTUBE_WORKER_OFFLINE';
}

export class YouTubeConnectionUnavailableError extends Error {
  readonly code = 'YOUTUBE_CONNECTION_NOT_CONNECTED';
}

export class ManageYouTubeConnectionService {
  constructor(
    private readonly connections: YouTubeConnectionDataServiceContract,
    private readonly scheduler: YouTubeConnectionWorkflowScheduler,
    private readonly workerAvailability: WorkerAvailability,
    private readonly ids: IdGenerator,
  ) {}

  async get(): Promise<YouTubeConnectionStatusEntityDto> {
    const [connection, workerAvailable] = await Promise.all([
      this.connections.getPrimary(),
      this.workerAvailability.isAvailable(),
    ]);
    return {
      connection,
      status: connection?.state ?? YouTubeConnectionState.Disconnected,
      testingExpiryWarning: testingExpiryWarning(connection),
      workerAvailable,
    };
  }

  async connect(): Promise<YouTubeConnectionStartEntityDto> {
    await this.requireWorkerAvailable();
    const existing = await this.connections.getPrimary();
    const connectionId = existing?.id ?? this.ids.randomId();
    const workflowId = await this.scheduler.startConnect({ connectionId });
    return { connectionId, workflowId };
  }

  async disconnect(): Promise<YouTubeConnectionStartEntityDto> {
    await this.requireWorkerAvailable();
    const existing = await this.connections.getPrimary();
    if (
      existing === null ||
      existing.state === YouTubeConnectionState.Disconnected
    ) {
      throw new YouTubeConnectionUnavailableError();
    }
    const workflowId = await this.scheduler.startDisconnect({
      connectionId: existing.id,
    });
    return { connectionId: existing.id, workflowId };
  }

  async acceptWorkerEvent(event: YouTubeConnectionWorkerEventEntity): Promise<void> {
    switch (event.type) {
      case 'CONNECTED':
        await this.connections.saveConnected(event.connection);
        return;
      case 'REAUTH_REQUIRED':
        await this.connections.markReauthRequired(event.connectionId);
        return;
      case 'DISCONNECTED':
        await this.connections.disconnect(
          event.connectionId,
          event.revocationUncertain,
        );
        return;
      case 'FAILED':
        return;
    }
  }

  private async requireWorkerAvailable(): Promise<void> {
    if (!(await this.workerAvailability.isAvailable())) {
      throw new YouTubeWorkerOfflineError();
    }
  }
}

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function testingExpiryWarning(
  connection: YouTubeConnectionEntityDto | null,
): string | null {
  if (
    connection?.oauthMode !== 'TESTING' ||
    connection.refreshTokenExpiresAt === null
  ) {
    return null;
  }
  return (
    'Google OAuth Testing refresh tokens may expire in seven days. Reconnect before ' +
    `${formatUtcMinute(connection.refreshTokenExpiresAt)}.`
  );
}

function formatUtcMinute(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = monthNames[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  const hour = String(value.getUTCHours()).padStart(2, '0');
  const minute = String(value.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`;
}
