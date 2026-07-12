import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProcessingPage from './page';

describe('ProcessingPage', () => {
  it('links to the local results route', async () => {
    render(
      await ProcessingPage({
        params: Promise.resolve({ projectId: 'project-1' }),
      }),
    );

    expect(
      screen.getByRole('link', { name: 'View local results' }),
    ).toHaveAttribute('href', '/projects/project-1/clips');
  });
});
