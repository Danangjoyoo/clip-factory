import { describe, expect, it } from 'vitest';
import { RecordProgressService } from './record-progress.service';

describe('RecordProgressService', () => {
  it('persists before publishing and records zero-duration terminal work', async () => {
    const calls: string[] = [];
    const service = new RecordProgressService(
      {
        upsert: async () => void calls.push('projection'),
        findActive: async () => [],
      },
      {
        create: async () => void calls.push('timing'),
        listThroughputs: async () => [],
      } as any,
      {
        publish: async () => void calls.push('live'),
        snapshot: async () => null,
        events: async function* () {},
      },
    );
    await service.execute({
      projectId: 'p',
      workflowId: 'w',
      stage: 'TRANSCRIBE',
      state: 'RUNNING',
      elapsedSeconds: 1,
      historicalThroughputs: [] as number[],
      completedUnits: 1,
      totalUnits: 2,
      unit: 'ITEMS',
      terminal: true,
      durationMs: 0,
    });
    expect(calls).toEqual(['projection', 'timing', 'live']);
  });

  it('skips timing storage for non-terminal heartbeats', async () => {
    const calls: string[] = [];
    const service = new RecordProgressService(
      {
        upsert: async () => void calls.push('projection'),
        findActive: async () => [],
      },
      {
        create: async () => void calls.push('timing'),
        listThroughputs: async () => [],
      } as any,
      {
        publish: async () => void calls.push('live'),
        snapshot: async () => null,
        events: async function* () {},
      },
    );
    await service.execute({
      projectId: 'p',
      workflowId: 'w',
      stage: 'TRANSCRIBE',
      state: 'RUNNING',
      elapsedSeconds: 1,
      historicalThroughputs: [] as number[],
      completedUnits: 1,
      totalUnits: 2,
      unit: 'ITEMS',
    });
    expect(calls).toEqual(['projection', 'live']);
  });
});
