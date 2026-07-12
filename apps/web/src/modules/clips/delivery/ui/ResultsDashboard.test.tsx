import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsDashboard } from './ResultsDashboard';

const renderedClip = {
  id: 'ready-clip',
  title: 'Ready clip',
  durationLabel: '00:28',
  state: 'RENDERED' as const,
  originLabel: 'AI highlight · 92 score',
  sizeLabel: '18 MB',
  formatLabel: 'MP4 · H.264 + AAC · captions stitched',
  downloadHref: '/downloads/ready-clip.mp4',
  editorHref: '/projects/project-1/editor',
};

const renderingClip = {
  ...renderedClip,
  id: 'rendering-clip',
  title: 'Rendering clip',
  state: 'RENDERING' as const,
  downloadHref: undefined,
  editorHref: undefined,
};

describe('ResultsDashboard', () => {
  it('keeps a rendered download available while another clip renders', () => {
    render(
      <ResultsDashboard
        clips={[renderedClip, renderingClip]}
        onDownloadAll={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Download MP4: Ready clip' }),
    ).toHaveAttribute('href', renderedClip.downloadHref);
    expect(
      screen.getByRole('button', { name: 'Download MP4: Rendering clip' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Open editor' }),
    ).toBeDisabled();
  });
});
