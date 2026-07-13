import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessingLocalPage } from './ProcessingLocalPage';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('ProcessingLocalPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    push.mockReset();
  });

  it('starts the project workflow and opens the editor when complete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          status: 'COMPLETED',
          editorHref: '/projects/project-1/editor',
        }),
      ),
    );

    render(<ProcessingLocalPage projectId="project-1" />);

    expect(
      screen.getByRole('region', { name: 'Processing run sheet' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/projects/project-1/workflow', {
        method: 'POST',
      }),
    );
    expect(push).toHaveBeenCalledWith('/projects/project-1/editor');
  });
});
