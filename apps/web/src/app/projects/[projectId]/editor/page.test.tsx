import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditorPage from './page';

describe('EditorPage', () => {
  it('renders the client editor wrapper without server event props', () => {
    render(<EditorPage />);

    expect(screen.getByRole('main', { name: 'Clip editor' })).toBeVisible();
    expect(screen.getByText('CANDIDATES')).toBeVisible();
  });
});
