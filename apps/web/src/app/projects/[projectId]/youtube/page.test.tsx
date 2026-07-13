import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProjectYouTubePage from './page';

describe('ProjectYouTubePage', () => {
  it('renders the project YouTube workspace route', async () => {
    render(
      await ProjectYouTubePage({
        params: Promise.resolve({ projectId: 'project-1' }),
      }),
    );

    expect(
      screen.getByRole('main', { name: 'YouTube publishing' }),
    ).toBeVisible();
  });
});
