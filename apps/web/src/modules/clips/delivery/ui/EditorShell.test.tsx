import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditorShell } from './EditorShell';

const clip = {
  id: 'clip-1',
  title: 'Opening',
  startMs: 1000,
  endMs: 5000,
  sourceDurationMs: 10000,
  state: 'READY',
};

describe('EditorShell', () => {
  it('wires selection, trim, add and render actions', async () => {
    const onTrimChange = vi.fn();
    const user = userEvent.setup();
    const onAddClip = vi.fn();
    const onRenderSelected = vi.fn();
    render(
      <EditorShell
        clips={[clip]}
        onSelect={vi.fn()}
        onAddClip={onAddClip}
        onTrimChange={onTrimChange}
        onRenderSelected={onRenderSelected}
        onRenderAll={vi.fn()}
      />,
    );
    expect(screen.getByRole('main', { name: 'Clip editor' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Trim timeline' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Render selected' }));
    expect(onRenderSelected).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Add Clip' }));
    expect(screen.getByDisplayValue('0')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^Add$/ }));
    expect(onAddClip).toHaveBeenCalledWith(0, 10000);
  });
});
