import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsageView } from './UsageView';

const report = {
  summary: {
    actual: '$0.010000',
    allocated: '$0.030000',
    possible: '$0.000000 possible',
  },
  projects: [{ id: 'project-1', name: 'What is branding?' }],
  analysisRuns: [],
  apiCalls: [],
  allocations: [],
  renders: [],
  models: [],
};

describe('UsageView', () => {
  it('uses the studio report shell and preserves provenance tables', () => {
    render(<UsageView report={report} />);

    expect(
      screen.getByRole('heading', { name: 'Usage and provenance' }),
    ).toBeVisible();
    expect(screen.getByText('COST AND PROVENANCE')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Cost summary' })).toBeVisible();
    expect(screen.getByText('Projects')).toBeVisible();
  });
});
