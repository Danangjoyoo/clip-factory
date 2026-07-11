import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrimTimeline } from './TrimTimeline';

describe('TrimTimeline', () => {
  it('moves the selected boundary by keyboard without crossing', async () => {
    const onChange = vi.fn();
    render(<TrimTimeline value={{ startMs: 1000, endMs: 5000, sourceDurationMs: 10000, maxDurationMs: 60000 }} onChange={onChange} />);
    await userEvent.setup().type(screen.getByRole('slider', { name: 'Clip end' }), '{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith({ startMs: 1000, endMs: 4990 });
  });
});
