import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublishingGallery, type PublishingClipVm } from './PublishingGallery';
import type { YouTubeConnectionVm } from './youtube-connection.vm';

afterEach(() => cleanup());

describe('PublishingGallery', () => {
  it('renders the YouTube workspace with the connection panel', () => {
    render(
      <PublishingGallery
        projectId="project-1"
        connection={makeConnectionVm({ status: 'DISCONNECTED' })}
        clips={[]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Project workspace' }),
    ).toHaveTextContent('YouTube');
    expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('button', { name: 'Connect YouTube' }),
    ).toBeVisible();
    expect(screen.getByText('No rendered clips are ready to publish.')).toBeVisible();
  });

  it('opens a details drawer with publishing tabs for a clip', async () => {
    const user = userEvent.setup();
    render(
      <PublishingGallery
        projectId="project-1"
        connection={makeConnectionVm({ status: 'CONNECTED' })}
        clips={[clip]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Details: Ready clip' }));

    expect(
      screen.getByRole('dialog', { name: 'Ready clip details' }),
    ).toBeVisible();
    for (const tab of ['Publishing', 'Metadata', 'Thumbnail', 'Schedule']) {
      expect(screen.getByRole('tab', { name: tab })).toBeVisible();
    }
  });
});

const clip: PublishingClipVm = {
  id: 'clip-1',
  title: 'Ready clip',
  durationLabel: '00:28',
  stateLabel: 'Rendered',
  metadataStatusLabel: 'Metadata draft needed',
  scheduleLabel: 'Not scheduled',
};

function makeConnectionVm(
  overrides: Partial<YouTubeConnectionVm> = {},
): YouTubeConnectionVm {
  const status = overrides.status ?? 'CONNECTED';
  return {
    status,
    statusLabel: status === 'CONNECTED' ? 'YouTube connected' : 'YouTube disconnected',
    workerAvailable: true,
    channelTitle: status === 'CONNECTED' ? 'Clip Factory Test' : null,
    channelHandle: status === 'CONNECTED' ? '@clipfactorytest' : null,
    testingExpiryWarning: null,
    revocationUncertain: false,
    ...overrides,
  };
}
