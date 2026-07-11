import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectCardView } from './project.presentation';
import ProjectLibrary from './ProjectLibrary';

afterEach(() => {
  cleanup();
});

const view = (overrides: Partial<ProjectCardView> = {}): ProjectCardView => ({
  id: 'p1',
  name: 'Demo',
  href: '/projects/p1',
  sourceHealthLabel: 'Source healthy',
  sourceHealthTone: 'neutral',
  modeLabel: 'AI Highlights',
  progressLabel: 'Queued',
  etaLabel: null,
  candidateCount: 0,
  renderCount: 0,
  spendLabel: '$0.00',
  updatedLabel: 'Aug 1, 2026, 3:00 PM',
  ...overrides,
});

it('shows loading, empty, and retry states', () => {
  const onRetry = vi.fn().mockResolvedValue(undefined);

  const { rerender } = render(
    <ProjectLibrary
      projects={[]}
      isLoading
      error={null}
      onRetry={onRetry}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByText('Loading projects…')).toBeVisible();

  rerender(
    <ProjectLibrary
      projects={[]}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Create your first project' })).toBeVisible();

  rerender(
    <ProjectLibrary
      projects={[]}
      isLoading={false}
      error={'network failure'}
      onRetry={onRetry}
      onDelete={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('keeps long names wrapped and keeps delete link order', () => {
  const longName = 'A'.repeat(100);
  const project = view({ name: longName });
  render(
    <ProjectLibrary
      projects={[project]}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: longName })).toBeVisible();
  const article = screen.getByRole('heading', { name: longName }).closest('article');
  const link = screen.getByRole('link', { name: longName });
  const deleteButton = screen.getByRole('button', { name: `Delete ${longName}` });
  expect(article).not.toBeNull();
  expect(
    link.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('does not render eta label for waiting states when presentation omits it', () => {
  render(
    <ProjectLibrary
      projects={[view({ id: 'p2', progressLabel: 'Source missing', etaLabel: null })]}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.queryByText(/Estimated/i)).not.toBeInTheDocument();
});

it('opens and resolves deletion flow', async () => {
  const initial = [view({ id: 'p3', name: 'Keep me' }), view({ id: 'p4', name: 'Delete me' })];
  const deleteSpy = vi.fn().mockResolvedValue(undefined);

  function Harness() {
    const [projects, setProjects] = useState(initial);
    return (
      <ProjectLibrary
        projects={projects}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onDelete={async (id) => {
          await deleteSpy(id);
          setProjects((current) => current.filter((item) => item.id !== id));
        }}
      />
    );
  }

  render(<Harness />);
  const deleteButton = screen.getByRole('button', { name: 'Delete Delete me' });
  fireEvent.click(deleteButton);
  expect(screen.getByRole('heading', { name: 'Delete Delete me?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'Delete Delete me?' })).not.toBeInTheDocument();
  });
  expect(screen.queryByRole('link', { name: 'Delete me' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Keep me' })).toBeVisible();
});

it('keeps confirmation dialog open when delete request fails', async () => {
  const failingDelete = vi.fn().mockRejectedValue(new Error('Unable to delete.'));
  render(
    <ProjectLibrary
      projects={[view({ id: 'p5', name: 'Fail me' })]}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      onDelete={failingDelete}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete Fail me' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to delete.');
  expect(screen.getByRole('heading', { name: 'Delete Fail me?' })).toBeVisible();
});
