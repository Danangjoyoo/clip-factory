import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { YouTubeConnectionPanel } from './youtube-connection-panel';
import type {
  YouTubeConnectionVm,
  YouTubeConnectionVmStatus,
} from './youtube-connection.vm';

afterEach(() => cleanup());

describe('YouTubeConnectionPanel', () => {
  it('disables connect while worker is offline with an actionable explanation', () => {
    render(
      <YouTubeConnectionPanel
        connection={makeConnectionVm({
          status: 'DISCONNECTED',
          workerAvailable: false,
        })}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Connect YouTube' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Start the native worker to connect or upload.'),
    ).toBeVisible();
  });

  it('shows reconnect and Testing expiry without losing channel identity', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(
      <YouTubeConnectionPanel
        connection={makeConnectionVm({
          status: 'REAUTH_REQUIRED',
          channelTitle: 'Clip Factory Test',
          testingExpiryWarning:
            'Google OAuth Testing refresh tokens may expire in seven days.',
        })}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByText('Clip Factory Test')).toBeVisible();
    expect(screen.getByText(/may expire in seven days/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reconnect YouTube' }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it('requires disconnect confirmation and explains revocation uncertainty', async () => {
    const user = userEvent.setup();
    const onDisconnect = vi.fn();
    render(
      <YouTubeConnectionPanel
        connection={makeConnectionVm({
          status: 'CONNECTED',
          revocationUncertain: true,
        })}
        onConnect={vi.fn()}
        onDisconnect={onDisconnect}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Disconnect YouTube' }));
    expect(
      screen.getByRole('dialog', { name: 'Disconnect YouTube?' }),
    ).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Revoke access and disconnect' }),
    );
    expect(onDisconnect).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/remote revocation could not be confirmed/),
    ).toBeVisible();
  });

  it.each([
    ['DISCONNECTED', 'YouTube disconnected'],
    ['CONNECTING', 'Connecting to YouTube'],
    ['CONNECTED', 'YouTube connected'],
    ['REAUTH_REQUIRED', 'Reconnect required'],
  ] as const)('renders status text for %s', (status, label) => {
    render(
      <YouTubeConnectionPanel
        connection={makeConnectionVm({ status })}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});

function makeConnectionVm(
  overrides: Partial<YouTubeConnectionVm> & {
    status?: YouTubeConnectionVmStatus;
  } = {},
): YouTubeConnectionVm {
  const status = overrides.status ?? 'CONNECTED';
  return {
    status,
    statusLabel: statusLabels[status],
    workerAvailable: true,
    channelTitle: 'Clip Factory Test',
    channelHandle: '@clipfactorytest',
    testingExpiryWarning: null,
    revocationUncertain: false,
    ...overrides,
  };
}

const statusLabels: Record<YouTubeConnectionVmStatus, string> = {
  DISCONNECTED: 'YouTube disconnected',
  CONNECTING: 'Connecting to YouTube',
  CONNECTED: 'YouTube connected',
  REAUTH_REQUIRED: 'Reconnect required',
};
