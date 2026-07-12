import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProcessingView } from './ProcessingView';

describe('ProcessingView', () => {
  it('explains the ETA source in the processing run sheet', () => {
    render(
      <ProcessingView
        value={{
          projectId: 'project-1',
          state: 'RUNNING',
          stage: 'Rendering',
          percent: 64,
          eta: '2–4 minutes remaining',
          stages: [{ name: 'Rendering', status: 'running' }],
          workerOnline: true,
          logs: [],
          analysisVersion: 'v1',
          analysisId: 'analysis-1',
        }}
      />,
    );

    expect(
      screen.getByText(/completed worker-stage timings/i),
    ).toBeInTheDocument();
  });
});
