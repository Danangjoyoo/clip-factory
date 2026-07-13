import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClipsPage from './page';

vi.mock('../../../../modules/clips/composition/clip-views.composition', () => ({
  resultsView: vi.fn().mockResolvedValue([]),
}));

describe('ClipsPage', () => {
  it('does not invent a clip or download before a render projection exists', async () => {
    render(
      await ClipsPage({
        params: Promise.resolve({ projectId: 'project-1' }),
      }),
    );

    expect(screen.queryByText('First local render')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open editor' }),
    ).not.toBeInTheDocument();
  });
});
