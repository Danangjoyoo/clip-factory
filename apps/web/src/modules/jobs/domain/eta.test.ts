import { describe, expect, it } from 'vitest';
import {
  calculateProgress,
  estimateEta,
  ProgressPresentation,
  queueEtaRange,
  weightedProgressBasisPoints,
} from './progress';

const baseInput = {
  projectId: '00000000-0000-4000-8000-000000000000',
  workflowId: '00000000-0000-4000-8000-000000000001',
  stage: 'TRANSCRIBE',
  unit: 'ITEMS',
  occurredAt: '2026-07-11T00:00:00.000Z',
  elapsedSeconds: 5,
  state: 'RUNNING',
  completedUnits: 0,
  totalUnits: 100,
  historicalThroughputs: [],
};

describe('estimateEta', () => {
  it.each(['AWAITING_BUDGET', 'PAID_CALL_UNCERTAIN', 'AWAITING_REVIEW'])(
    'suppresses ETA for %s',
    (state) =>
      expect(
        estimateEta({
          ...baseInput,
          state,
          completed: 10n,
          total: 100n,
          elapsedSeconds: 5,
          historicalThroughputs: [2],
          stage: 'RUNNING',
        }),
      ).toEqual({ lowSeconds: null, highSeconds: null, confidence: 'NOT_APPLICABLE' }),
  );

  it('returns a low-confidence first-run range when no throughput', () =>
    expect(
      estimateEta({
        state: 'RUNNING',
        completed: 0n,
        total: 100n,
        elapsedSeconds: 5,
        historicalThroughputs: [] as number[],
        stage: 'RUNNING',
      }),
    ).toEqual({ lowSeconds: null, highSeconds: null, confidence: 'LOW' }));

  it('widens OpenAI initial ETA to 0.7x-2x range', () =>
      expect(
        estimateEta({
          state: 'RUNNING',
          completed: 2n,
          total: 100n,
          elapsedSeconds: 5,
          historicalThroughputs: [] as number[],
        stage: 'OPENAI_TRANSCRIBE',
      }),
    ).toEqual({ lowSeconds: 172, highSeconds: 490, confidence: 'LOW' }));
});

describe('calculateProgress', () => {
  it('returns zero progress with unknown historical rates when no elapsed progress', () => {
    const event: ProgressPresentation = calculateProgress({
      ...baseInput,
      state: 'RUNNING',
      completedUnits: 0,
      totalUnits: 100,
      elapsedSeconds: 5,
      historicalThroughputs: [] as number[],
    });
    expect(event.progressBasisPoints).toBe(0);
    expect(event.eta).toEqual({ lowSeconds: null, highSeconds: null, confidence: 'LOW' });
    expect(event.status).toBe('RUNNING');
  });
});

describe('weightedProgressBasisPoints', () => {
  it('weights measured work with custom stage weights', () => {
    expect(
      Math.round(
        weightedProgressBasisPoints([
          { completed: 1n, total: 4n, weight: 3n },
          { completed: 8n, total: 10n, weight: 1n },
        ]),
      ),
    ).toBe(3875);
  });

  it('throws for invalid weighted input', () =>
    expect(() => weightedProgressBasisPoints([])).toThrow('INVALID_WORK_UNITS'));
});

describe('queueEtaRange', () => {
  it('adds queue medians to active high range', () => {
    expect(
      queueEtaRange(
        {
          lowSeconds: 1,
          highSeconds: 4,
          confidence: 'LOW',
        },
        [3, 7],
      ),
    ).toEqual({ lowSeconds: 11, highSeconds: 14, confidence: 'LOW' });
  });
});
