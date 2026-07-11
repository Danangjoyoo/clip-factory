import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeleteProjectDialog from './DeleteProjectDialog';

describe('DeleteProjectDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders heading, policy copy, and accessible actions', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteProjectDialog
        open
        projectName="Sample"
        busy={false}
        error={null}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Delete Sample?' })).toBeVisible();
    expect(
      screen.getByText('Local filepath sources are never deleted.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables delete while request is busy and keeps dialog visible on failure', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <DeleteProjectDialog
        open
        projectName="Failing sample"
        busy
        error="Request failed"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0]!;
    expect(deleteButton).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
    fireEvent.click(deleteButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
