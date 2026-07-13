import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeYouTubeConnectionEntity } from '../../../../test-utils/youtube-publishing-builders';
import type { WorkflowId, YouTubeConnectionId } from '../../../../shared/domain';
import type { YouTubeConnectionDataServiceContract } from '../data-services/youtube-connection.data-service';
import type { YouTubeConnectionEntityDto } from '../dto/entity/youtube-publishing-entity.dto';
import { YouTubeConnectionState } from '../dto/entity/youtube-publishing-entity.dto';
import type { ConnectedChannelInput } from '../ports/youtube-connection.repository';
import type { YouTubeConnectionWorkflowScheduler } from '../ports/youtube-connection-workflow-scheduler';
import {
  ManageYouTubeConnectionService,
  type IdGenerator,
  type WorkerAvailability,
} from './manage-youtube-connection.service';

const connectionId =
  '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42' as YouTubeConnectionId;

type ConnectionDataServiceFake = YouTubeConnectionDataServiceContract & {
  getPrimary: Mock<() => Promise<YouTubeConnectionEntityDto | null>>;
  saveConnected: Mock<
    (input: ConnectedChannelInput) => Promise<YouTubeConnectionEntityDto>
  >;
  markReauthRequired: Mock<
    (id: YouTubeConnectionId) => Promise<YouTubeConnectionEntityDto>
  >;
  disconnect: Mock<
    (
      id: YouTubeConnectionId,
      revocationUncertain: boolean,
    ) => Promise<YouTubeConnectionEntityDto>
  >;
};

type SchedulerFake = YouTubeConnectionWorkflowScheduler & {
  startConnect: Mock<
    (input: { connectionId: YouTubeConnectionId }) => Promise<WorkflowId>
  >;
  startDisconnect: Mock<
    (input: { connectionId: YouTubeConnectionId }) => Promise<WorkflowId>
  >;
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-07-11T00:00:00.000Z') });
});

describe('ManageYouTubeConnectionService', () => {
  it('starts a token-free connect workflow only when the worker is available', async () => {
    const scheduler = makeConnectionSchedulerFake();
    const service = makeConnectionService({
      scheduler,
      workerAvailability: { isAvailable: vi.fn().mockResolvedValue(true) },
      idGenerator: { randomId: () => connectionId },
    });

    await expect(service.connect()).resolves.toEqual({
      connectionId,
      workflowId: 'workflow-1',
    });
    expect(scheduler.startConnect).toHaveBeenCalledWith({ connectionId });
  });

  it('rejects connect while the worker is offline', async () => {
    const service = makeConnectionService({
      workerAvailability: { isAvailable: vi.fn().mockResolvedValue(false) },
      idGenerator: { randomId: () => connectionId },
    });

    await expect(service.connect()).rejects.toMatchObject({
      code: 'YOUTUBE_WORKER_OFFLINE',
    });
  });

  it('reuses the same opaque UUID when reconnecting', async () => {
    const existing = makeYouTubeConnectionEntity({
      id: connectionId,
      state: YouTubeConnectionState.ReauthRequired,
    });
    const dataService = makeConnectionDataServiceFake({ connected: existing });
    const scheduler = makeConnectionSchedulerFake();
    const service = makeConnectionService({
      dataService,
      scheduler,
      idGenerator: { randomId: vi.fn(() => 'new-id-must-not-be-used' as never) },
    });

    await expect(service.connect()).resolves.toMatchObject({ connectionId });
    expect(scheduler.startConnect).toHaveBeenCalledWith({ connectionId });
  });

  it('persists sanitized invalid_grant without losing the channel record', async () => {
    const dataService = makeConnectionDataServiceFake({
      connected: makeYouTubeConnectionEntity(),
    });
    const service = makeConnectionService({ dataService });

    await service.acceptWorkerEvent({
      connectionId,
      type: 'REAUTH_REQUIRED',
      reasonCode: 'INVALID_GRANT',
    });

    expect(dataService.markReauthRequired).toHaveBeenCalledWith(connectionId);
    expect(dataService.disconnect).not.toHaveBeenCalled();
  });

  it('retains history and revocation uncertainty on disconnect completion', async () => {
    const dataService = makeConnectionDataServiceFake({
      connected: makeYouTubeConnectionEntity(),
    });
    const service = makeConnectionService({ dataService });

    await service.acceptWorkerEvent({
      connectionId,
      type: 'DISCONNECTED',
      revocationUncertain: true,
    });

    expect(dataService.disconnect).toHaveBeenCalledWith(connectionId, true);
  });

  it('shows the exact seven-day Testing-mode reconnect warning', async () => {
    const service = makeConnectionService({
      dataService: makeConnectionDataServiceFake({
        connected: makeYouTubeConnectionEntity({
          oauthMode: 'TESTING',
          refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
        }),
      }),
    });

    await expect(service.get()).resolves.toMatchObject({
      testingExpiryWarning:
        'Google OAuth Testing refresh tokens may expire in seven days. Reconnect before 18 Jul 2026, 00:00 UTC.',
    });
  });
});

function makeConnectionService({
  dataService = makeConnectionDataServiceFake(),
  scheduler = makeConnectionSchedulerFake(),
  workerAvailability = { isAvailable: vi.fn().mockResolvedValue(true) },
  idGenerator = { randomId: () => connectionId },
}: {
  dataService?: YouTubeConnectionDataServiceContract;
  scheduler?: YouTubeConnectionWorkflowScheduler;
  workerAvailability?: WorkerAvailability;
  idGenerator?: IdGenerator;
} = {}): ManageYouTubeConnectionService {
  return new ManageYouTubeConnectionService(
    dataService,
    scheduler,
    workerAvailability,
    idGenerator,
  );
}

function makeConnectionDataServiceFake({
  connected = null,
}: {
  connected?: YouTubeConnectionEntityDto | null;
} = {}): ConnectionDataServiceFake {
  const fallback = connected ?? makeYouTubeConnectionEntity({ id: connectionId });
  return {
    getPrimary: vi.fn().mockResolvedValue(connected),
    saveConnected: vi.fn().mockResolvedValue(fallback),
    markReauthRequired: vi.fn().mockResolvedValue({
      ...fallback,
      state: YouTubeConnectionState.ReauthRequired,
    }),
    disconnect: vi.fn().mockResolvedValue({
      ...fallback,
      state: YouTubeConnectionState.Disconnected,
      disconnectedAt: new Date('2026-07-11T00:00:00.000Z'),
    }),
  };
}

function makeConnectionSchedulerFake(): SchedulerFake {
  return {
    startConnect: vi.fn().mockResolvedValue('workflow-1' as WorkflowId),
    startDisconnect: vi.fn().mockResolvedValue('workflow-2' as WorkflowId),
  };
}
