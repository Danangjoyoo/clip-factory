import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisSettings } from './AnalysisSettings';
import { NewProjectForm } from './NewProjectForm';
import { SourceValidationPanel } from './SourceValidationPanel';

describe('SourceValidationPanel', () => {
  it('keeps setup values when source validation fails', () => {
    render(
      <SourceValidationPanel
        title="What is branding?"
        error="SOURCE_NOT_FOUND"
        onReplace={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('What is branding?')).toBeInTheDocument();
    expect(screen.getByText('Replace source')).toBeInTheDocument();
  });
});

describe('AnalysisSettings', () => {
  it('describes Complete mode without promising automatic publication', () => {
    render(
      <AnalysisSettings
        mode="COMPLETE"
        model="gpt-5.6-sol"
        reasoning="high"
        catalog={{}}
        onMode={vi.fn()}
        onModel={vi.fn()}
        onReasoning={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/confirm every schedule and upload/i),
    ).toBeInTheDocument();
  });
});

describe('NewProjectForm', () => {
  it('clears source recovery state when replacing a valid source', () => {
    render(<NewProjectForm sourceValidationError="SOURCE_NOT_FOUND" />);

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Branding' },
    });
    fireEvent.change(screen.getByLabelText('Video filepath'), {
      target: { value: '/videos/branding.mp4' },
    });

    expect(
      screen.getByRole('button', { name: 'Create project' }),
    ).toBeDisabled();

    const form = screen
      .getByRole('heading', { name: 'New project' })
      .closest('form');
    expect(form).not.toBeNull();
    fireEvent.click(
      within(form as HTMLFormElement).getByRole('button', {
        name: 'Replace source',
      }),
    );

    expect(
      screen.getByRole('button', { name: 'Create project' }),
    ).toBeEnabled();
  });
});
