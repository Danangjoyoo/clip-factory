import { describe, expect, it } from 'vitest';
import {
  RelinkConfirmationRequiredError,
  RelinkSourceService,
} from './relink-source.service';

const source = {
  id: 's',
  projectId: 'p',
  fingerprint: 'old',
  probe: {
    durationMs: 1000,
    width: 10,
    height: 10,
    hasAudio: true,
    codecFamily: 'h264',
  },
} as any;
const make = (validated: any) => {
  const calls: any[] = [];
  const sources: any = {
    getByProjectId: async () => source,
    markRelinking: async () => {
      calls.push('relinking');
    },
    relink: async (_id: string, c: any) => ({ ...source, ...c }),
  };
  const validator = { validateCandidate: async () => validated };
  const uow = { execute: async (fn: any) => fn({}) };
  const workflows = {
    cancel: async () => undefined,
    signal: async (...args: any[]) => {
      calls.push(args);
    },
  };
  return {
    service: new RelinkSourceService(uow as any, sources, workflows, validator),
    calls,
  };
};

describe('RelinkSourceService', () => {
  it('validates through worker and asks confirmation for changed fingerprint', async () => {
    const h = make({
      displayPath: 'new',
      resolvedPath: '/tmp/new',
      sizeBytes: 1n,
      modifiedAt: new Date(),
      fingerprint: 'new',
      probe: source.probe,
    });
    await expect(
      h.service.execute({
        projectId: 'p',
        candidate: { displayPath: 'new', resolvedPath: '/tmp/new' },
      }),
    ).resolves.toMatchObject({
      confirmationRequired: true,
      fingerprint: 'new',
    });
    expect(h.calls[0]).toBe('relinking');
  });
  it('persists only validated metadata after confirmation', async () => {
    const validated = {
      displayPath: 'validated',
      resolvedPath: '/safe/new',
      sizeBytes: 2n,
      modifiedAt: new Date(),
      fingerprint: 'new',
      probe: source.probe,
    };
    const h = make(validated);
    await h.service.execute({
      projectId: 'p',
      candidate: { displayPath: 'client', resolvedPath: '/client' },
      confirmedFingerprint: 'new',
    });
    expect(h.calls).toContainEqual(['p', 'source_relinked']);
  });
});
