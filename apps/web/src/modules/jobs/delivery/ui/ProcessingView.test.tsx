import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProcessingView } from './ProcessingView';

describe('ProcessingView', () => {
  afterEach(cleanup);

  it('uses the approved analysis-run workbench copy and details rail', () => {
    render(
      <ProcessingView
        value={{
          projectId: 'project-1',
          state: 'RUNNING',
          stage: 'Rank highlights',
          percent: 68,
          eta: 'about 4-7 minutes left',
          stages: [
            { name: 'Prepare source', status: 'complete' },
            { name: 'Transcribe', status: 'complete' },
            { name: 'Rank highlights', status: 'running' },
            { name: 'Ready for review', status: 'pending' },
          ],
          workerOnline: true,
          logs: ['10:36:04 transcript ranking started'],
          analysisVersion: 'gpt-5.6 - medium',
          analysisId: 'analysis-1',
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Finding the strongest moments.' }),
    ).toBeVisible();
    expect(screen.getByText('ANALYSIS RUN')).toBeVisible();
    expect(screen.getByText('RUN DETAILS')).toBeVisible();
    expect(screen.getByText(/pause before any paid work/i)).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveTextContent('68%');
  });

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
