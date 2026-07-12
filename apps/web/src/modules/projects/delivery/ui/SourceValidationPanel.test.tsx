import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisSettings } from './AnalysisSettings';
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
