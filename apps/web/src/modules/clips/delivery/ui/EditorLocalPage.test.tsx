import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorLocalPage } from './EditorLocalPage';

describe('EditorLocalPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows clip editor and transcript tabs with transcript download', async () => {
    const user = userEvent.setup();
    render(
      <EditorLocalPage
        projectId="project-1"
        initialClips={[
          {
            id: 'clip-1',
            title: 'Opening hook',
            startMs: 0,
            endMs: 30_000,
            sourceDurationMs: 60_000,
            state: 'RENDERED',
          },
        ]}
        transcript={{
          text: 'Branding makes a promise memorable.',
          downloadHref: '/api/projects/project-1/transcript',
        }}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Clip editor' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    expect(
      screen.getByText('Branding makes a promise memorable.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Download transcript' }),
    ).toHaveAttribute('href', '/api/projects/project-1/transcript');
  });
});
