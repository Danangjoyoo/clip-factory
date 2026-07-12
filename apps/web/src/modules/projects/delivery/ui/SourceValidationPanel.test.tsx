import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisSettings } from './AnalysisSettings';
import { NewProjectForm } from './NewProjectForm';
import { SourceValidationPanel } from './SourceValidationPanel';

afterEach(cleanup);

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
  it('starts with local filepath selected for source intake', () => {
    const { container } = render(<NewProjectForm />);
    const form = within(container)
      .getByRole('heading', {
        name: 'New project',
      })
      .closest('form') as HTMLFormElement;

    expect(
      within(form).getByRole('tab', { name: 'Local filepath' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(within(form).getByLabelText('Video filepath')).toBeVisible();
  });

  it('clears source recovery state when replacing a valid source', () => {
    render(<NewProjectForm sourceValidationError="SOURCE_NOT_FOUND" />);

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Branding' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Local filepath' }));
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

  it('requires a selected file for upload source creation', () => {
    const { container } = render(<NewProjectForm />);
    const form = within(container)
      .getByRole('heading', {
        name: 'New project',
      })
      .closest('form') as HTMLFormElement;

    fireEvent.change(within(form).getByLabelText('Project name'), {
      target: { value: 'Branding' },
    });
    fireEvent.click(within(form).getByRole('tab', { name: 'Upload file' }));

    expect(
      within(form).getByRole('button', { name: 'Create project' }),
    ).toBeDisabled();

    fireEvent.change(within(form).getByLabelText('Video file'), {
      target: {
        files: [new File(['video'], 'branding.mp4', { type: 'video/mp4' })],
      },
    });

    expect(
      within(form).getByRole('button', { name: 'Create project' }),
    ).toBeEnabled();
  });

  it('disables AI-assisted modes when OpenAI API key is missing', () => {
    const { container } = render(
      <NewProjectForm openAiApiKeyConfigured={false} />,
    );
    const form = within(container)
      .getByRole('heading', {
        name: 'New project',
      })
      .closest('form') as HTMLFormElement;

    expect(
      within(form).getByText(
        'OpenAI API KEY is missing, AI Assisted Mode is disabled',
      ),
    ).toBeInTheDocument();
    expect(
      within(form).getByRole('option', { name: 'Partial' }),
    ).toBeDisabled();
    expect(
      within(form).getByRole('option', { name: 'Advanced' }),
    ).toBeDisabled();
    expect(
      within(form).getByRole('option', { name: 'Complete' }),
    ).toBeDisabled();
  });
});
