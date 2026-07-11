import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectCardView } from './project.presentation';
import ProjectCard from './ProjectCard';

import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

describe('ProjectCard', () => {
  it('renders all required project metadata', () => {
    const project: ProjectCardView = {
      id: 'project-1',
      name: 'Demo project',
      href: '/projects/project-1',
      sourceHealthLabel: 'Source changed',
      sourceHealthTone: 'warning',
      modeLabel: 'Manual — No cloud AI / no API cost',
      progressLabel: 'Transcribing 42%',
      etaLabel: 'Estimated 8–12 minutes remaining',
      candidateCount: 2,
      renderCount: 1,
      spendLabel: '$0.00',
      updatedLabel: 'Aug 1, 2026, 3:00 PM',
    };

    render(
      <ProjectCard
        project={project}
        onDeleteRequest={() => {
          /* no-op */
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Demo project' })).toBeVisible();
    expect(screen.getByText('Source changed')).toBeVisible();
    expect(screen.getByText('Manual — No cloud AI / no API cost')).toBeVisible();
    expect(screen.getByText('Transcribing 42%')).toBeVisible();
    expect(screen.getByText('Estimated 8–12 minutes remaining')).toBeVisible();
    expect(screen.getByText('2 clips · 1 render · $0.00')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Demo project' })).toHaveAttribute(
      'href',
      '/projects/project-1',
    );
    expect(
      screen.getByRole('button', { name: 'Delete Demo project' }),
    ).toBeVisible();
    expect(
      screen.getByText('Source changed').parentElement?.className,
    ).toContain('_status_');
  });
});
