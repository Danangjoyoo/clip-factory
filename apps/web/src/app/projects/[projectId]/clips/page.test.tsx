import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClipsPage from './page';

describe('ClipsPage', () => {
  it('does not invent a clip or download before a render projection exists', async () => {
    render(<ClipsPage />);

    expect(screen.queryByText('First local render')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open editor' })).not.toBeInTheDocument();
  });
});
