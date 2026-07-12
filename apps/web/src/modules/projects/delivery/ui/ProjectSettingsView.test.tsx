import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ProjectSettingsView,
  type ProjectSettingsViewModel,
} from './ProjectSettingsView';

const settings: ProjectSettingsViewModel = {
  projectId: 'episode-1',
  projectTitle: 'Episode one',
  instruction: 'Keep the pacing tight.',
  sourceHealthLabel: 'Source ready',
  sourceLabel: 'what-is-branding.mp4',
  outputFrameLabel: 'Vertical 9:16 · 1080×1920',
  platformLabel: 'YouTube Shorts',
  maxDurationLabel: '45 seconds',
  captionStyleLabel: 'Bold lower third',
};

const handlers = {
  onSaveGeneral: vi.fn(),
  onRelinkSource: vi.fn(),
  onSaveDefaults: vi.fn(),
  onDeleteProject: vi.fn(),
};

describe('ProjectSettingsView', () => {
  afterEach(cleanup);

  it('shows only the selected settings section', async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsView value={settings} {...handlers} />);

    await user.click(screen.getByRole('tab', { name: 'Defaults' }));

    expect(screen.getByText('Defaults for new manual clips')).toBeVisible();
    expect(screen.queryByText('Delete project')).not.toBeInTheDocument();
  });

  it('states that existing clips retain their edits', async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsView value={settings} {...handlers} />);

    await user.click(screen.getByRole('tab', { name: 'Defaults' }));

    expect(
      screen.getByText(/Existing clips keep their own edits/i),
    ).toBeVisible();
  });
});
