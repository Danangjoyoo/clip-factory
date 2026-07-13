import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClipUpdateOverlay } from './ClipUpdateOverlay';

describe('ClipUpdateOverlay', () => {
  it('shows the selected clip update progress and ETA', () => {
    render(<ClipUpdateOverlay percent={42} etaLabel="About 30 seconds left" />);

    expect(screen.getByText('Updating 42%')).toBeVisible();
    expect(screen.getByText('About 30 seconds left')).toBeVisible();
  });
});
