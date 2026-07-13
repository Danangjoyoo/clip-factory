import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('identifies the local application', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Work in motion.' }),
    ).toBeVisible();
  });
});
