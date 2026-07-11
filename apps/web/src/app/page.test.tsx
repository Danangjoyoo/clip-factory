import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';

vi.mock('../modules/projects/delivery/ui/use-project-library', () => ({
  useProjectLibrary: () => ({
    projects: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

describe('HomePage', () => {
  it('renders project library shell', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'New project' })).toBeVisible();
  });
});
