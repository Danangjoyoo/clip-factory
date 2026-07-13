import { describe, expect, it, vi } from 'vitest';

import type { YouTubeConnectionId } from '../../../../shared/domain';
import { makeYouTubeConnectionEntity } from '../../../../test-utils/youtube-publishing-builders';
import { YouTubeWorkerOfflineError } from '../../application/services/manage-youtube-connection.service';
import { YouTubeConnectionController } from './youtube-connection.controller';

const connectionId =
  '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42' as YouTubeConnectionId;
const credentialMaterialPattern =
  /"accessToken"|"refreshToken"|"authorizationCode"|"codeVerifier"|"clientSecret"|access_token|refresh_token|authorization_code|code_verifier|client_secret/i;

describe('YouTubeConnectionController', () => {
  it('GET /api/v1/youtube/connections returns sanitized status without credentials', async () => {
    const service = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      get: vi.fn().mockResolvedValue({
        connection: makeYouTubeConnectionEntity({
          id: connectionId,
          refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
        }),
        status: 'CONNECTED',
        testingExpiryWarning:
          'Google OAuth Testing refresh tokens may expire in seven days.',
        workerAvailable: true,
      }),
      acceptWorkerEvent: vi.fn(),
    };
    const controller = new YouTubeConnectionController(
      service as never,
      'internal-token',
    );

    const response = await controller.get();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: connectionId,
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
    expect(JSON.stringify(body)).not.toMatch(credentialMaterialPattern);
  });

  it('POST /api/v1/youtube/connections returns 202 without credentials', async () => {
    const service = {
      connect: vi.fn().mockResolvedValue({
        connectionId,
        workflowId: 'workflow-1',
      }),
      disconnect: vi.fn(),
      get: vi.fn(),
      acceptWorkerEvent: vi.fn(),
    };
    const controller = new YouTubeConnectionController(
      service as never,
      'internal-token',
    );

    const response = await controller.connect(
      new Request('http://localhost/api/v1/youtube/connections', {
        method: 'POST',
        body: '{}',
      }),
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({
      connectionId,
      workflowId: 'workflow-1',
    });
    expect(JSON.stringify(body)).not.toMatch(credentialMaterialPattern);
  });

  it('maps worker-offline connect attempts to 503', async () => {
    const service = {
      connect: vi.fn().mockRejectedValue(new YouTubeWorkerOfflineError()),
      disconnect: vi.fn(),
      get: vi.fn(),
      acceptWorkerEvent: vi.fn(),
    };
    const controller = new YouTubeConnectionController(
      service as never,
      'internal-token',
    );

    const response = await controller.connect(
      new Request('http://localhost/api/v1/youtube/connections', {
        method: 'POST',
        body: '{}',
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'YOUTUBE_WORKER_OFFLINE',
      message: 'Start the native worker to connect or upload.',
    });
  });

  it('internal connection event requires worker authentication and rejects extra fields', async () => {
    const service = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      get: vi.fn(),
      acceptWorkerEvent: vi.fn(),
    };
    const controller = new YouTubeConnectionController(
      service as never,
      'internal-token',
    );

    const unauthenticated = await controller.acceptInternalEvent(
      new Request('http://localhost/api/internal/v1/youtube/connections/events', {
        method: 'POST',
        body: JSON.stringify({
          type: 'REAUTH_REQUIRED',
          contractVersion: 1,
          connectionId,
          reasonCode: 'INVALID_GRANT',
        }),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const extraField = await controller.acceptInternalEvent(
      new Request('http://localhost/api/internal/v1/youtube/connections/events', {
        method: 'POST',
        headers: { authorization: 'Bearer internal-token' },
        body: JSON.stringify({
          type: 'REAUTH_REQUIRED',
          contractVersion: 1,
          connectionId,
          reasonCode: 'INVALID_GRANT',
          refreshToken: 'sentinel',
        }),
      }),
    );
    expect(extraField.status).toBe(400);
    expect(service.acceptWorkerEvent).not.toHaveBeenCalled();
  });
});
