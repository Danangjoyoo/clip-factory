import { beforeEach, describe, expect, it } from 'vitest';
import { fakeControl, type PaidCallCrashMode } from './fake-control';

describe('fake control', () => {
  beforeEach(() => fakeControl.reset());

  it('returns bounded deterministic highlights and records sanitized requests', () => {
    fakeControl.configure({ maxCandidates: 3 });
    const response = fakeControl.highlight({
      transcript: 'private transcript',
      instruction: 'find highlights',
      mediaPath: '/Users/alice/private.mp4',
    });

    expect(response.candidates).toHaveLength(3);
    expect(response.responseId).toBe('fake-response-1');
    expect(response.usage).toEqual({ inputTokens: 120, outputTokens: 80 });
    expect(fakeControl.audit()).toEqual([
      expect.objectContaining({
        transcript: 'private transcript',
        instruction: 'find highlights',
      }),
    ]);
    expect(fakeControl.audit()[0]).not.toHaveProperty('mediaPath');
  });

  it.each<PaidCallCrashMode>([
    'AFTER_CALLBACK_COMMIT_BEFORE_ACK',
    'AFTER_SEND_BEFORE_DURABLE_RESPONSE',
  ])('stores paid-call crash mode %s', (mode) => {
    fakeControl.configure({ paidCallCrash: mode });
    expect(fakeControl.state().paidCallCrash).toBe(mode);
  });
});
