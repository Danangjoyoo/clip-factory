import { describe, expect, it } from 'vitest';
import { redactDiagnosticRecord } from './redaction';
describe('redaction', () => {
  it('preserves safe scalars and redacts secrets, paths, text', () => {
    expect(
      redactDiagnosticRecord({
        modelId: 'gpt',
        durationMs: 3,
        apiKey: 'sk-proj-secret',
        path: '/Users/me/a.mov',
        transcript: 'hello',
      }),
    ).toEqual({
      modelId: 'gpt',
      durationMs: 3,
      apiKey: '[REDACTED_SECRET]',
      path: '[REDACTED_PATH]',
      transcript: '[REDACTED_TEXT]',
    });
  });
});
