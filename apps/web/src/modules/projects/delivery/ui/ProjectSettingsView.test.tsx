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

  it('uses the project-scoped settings shell from the approved review', () => {
    render(<ProjectSettingsView value={settings} {...handlers} />);

    expect(
      screen.getByRole('heading', { name: 'Project settings' }),
    ).toBeVisible();
    expect(
      screen.getByText(/Settings are scoped to Episode one/i),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
      'href',
      '/projects/episode-1/youtube',
    );
    expect(screen.getByRole('tab', { name: 'General' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Source' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Defaults' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Danger zone' })).toBeVisible();
  });

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

  it('links tabs to their panel and supports vertical keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsView value={settings} {...handlers} />);

    const general = screen.getByRole('tab', { name: 'General' });
    general.focus();
    await user.keyboard('{ArrowDown}');

    const source = screen.getByRole('tab', { name: 'Source' });
    expect(source).toHaveAttribute('aria-selected', 'true');
    expect(source).toHaveAttribute('aria-controls', 'project-settings-source');
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'project-settings-tab-source',
    );
  });

  it('edits defaults and confirms deletion without claiming external assets are deleted', async () => {
    const user = userEvent.setup();
    render(<ProjectSettingsView value={settings} {...handlers} />);

    await user.click(screen.getByRole('tab', { name: 'Defaults' }));
    await user.selectOptions(screen.getByLabelText('Platform'), 'TikTok');
    await user.click(screen.getByRole('button', { name: 'Save defaults' }));
    expect(handlers.onSaveDefaults).toHaveBeenCalledWith({
      platform: 'TikTok',
      maxDuration: '45 seconds',
      captionStyle: 'Bold lower third',
    });

    await user.click(screen.getByRole('tab', { name: 'Danger zone' }));
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Rendered files and remote YouTube uploads are untouched.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Delete project permanently' }),
    );
    expect(handlers.onDeleteProject).toHaveBeenCalledOnce();
  });
});
