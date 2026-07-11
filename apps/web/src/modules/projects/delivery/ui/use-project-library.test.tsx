import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProjectLibrary } from './use-project-library';

const makeJsonResponse = <T,>(payload: T): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const makeErrorResponse = (message: string): Response =>
  new Response(message, {
    status: 500,
  });

const makeNoContentResponse = () =>
  new Response(null, {
    status: 204,
    statusText: 'No Content',
  });

const sampleProjects = [
  {
    id: 'p1',
    name: 'Alpha',
    mode: 'MANUAL',
    status: 'COMPLETED',
    openaiSpendMicrousd: '0',
    updatedAt: '2026-08-01T10:00:00.000Z',
    source: { health: 'HEALTHY' },
    candidateCount: 3,
    renderCount: 1,
  },
  {
    id: 'p2',
    name: 'Beta',
    mode: 'MANUAL',
    status: 'COMPLETED',
    openaiSpendMicrousd: '200000',
    updatedAt: '2026-08-01T10:00:00.000Z',
    source: { health: 'HEALTHY' },
    candidateCount: 0,
    renderCount: 0,
  },
];

const ProjectLibraryHarness = () => {
  const { projects, isLoading, error, deleteProject } = useProjectLibrary();

  return (
    <div>
      <p>{isLoading ? 'loading' : 'ready'}</p>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <span>{project.name}</span>
            <button
              type="button"
              aria-label={`delete-${project.id}`}
              onClick={async () => {
                await deleteProject(project.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('useProjectLibrary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads projects and maps API response', async () => {
    const projects = [...sampleProjects];
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (typeof input === 'string' && input === '/api/projects' && !init) {
        return makeJsonResponse(projects);
      }
      return makeErrorResponse('missing path');
    });

    render(<ProjectLibraryHarness />);

    expect(await screen.findByText('ready')).toBeVisible();
    expect(screen.getByText('Alpha')).toBeVisible();
    expect(screen.getByText('Beta')).toBeVisible();
  });

  it('deletes project and refreshes list', async () => {
    const projects = [...sampleProjects];
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (typeof input === 'string' && input === '/api/projects' && !init) {
        return makeJsonResponse(projects);
      }
      if (
        typeof input === 'string' &&
        input === '/api/projects/p1' &&
        init?.method === 'DELETE'
      ) {
        const index = projects.findIndex((project) => project.id === 'p1');
        if (index > -1) {
          projects.splice(index, 1);
        }
        return makeNoContentResponse();
      }
      return makeErrorResponse('missing path');
    });

    render(<ProjectLibraryHarness />);

    expect(await screen.findByText('Alpha')).toBeVisible();
    expect(await screen.findByText('Beta')).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'delete-p1' }));

    await waitFor(() => {
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Beta')).toBeVisible();
  });

  it('shows load error when list request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeErrorResponse('failed')); // first load

    render(<ProjectLibraryHarness />);

    expect(await screen.findByRole('alert')).toHaveTextContent('failed');
  });
});
