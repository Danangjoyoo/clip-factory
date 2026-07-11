import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectLibrary } from './ProjectLibrary';
const project = {
  id: '1',
  name: 'Episode',
  href: '/projects/1',
  sourceHealthLabel: 'Source changed',
  sourceHealthTone: 'warning' as const,
  modeLabel: 'Manual — No cloud AI / no API cost',
  progressLabel: 'Transcribing 42%',
  etaLabel: 'Estimated 8–12 minutes remaining',
  candidateCount: 2,
  renderCount: 1,
  spendLabel: '$0.00',
  updatedLabel: 'Today',
};
describe('ProjectLibrary', () => {
  it('renders project metadata', () => {
    render(<ProjectLibrary projects={[project]} onDelete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeVisible();
    expect(screen.getByText('Source changed')).toBeVisible();
    expect(screen.getByText('2 clips · 1 render · $0.00')).toBeVisible();
  });
  it('renders empty state', () => {
    render(<ProjectLibrary projects={[]} onDelete={vi.fn()} />);
    expect(screen.getByText('No projects yet')).toBeVisible();
  });
});
