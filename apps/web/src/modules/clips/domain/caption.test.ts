import { describe, expect, it } from 'vitest';
import { validateCaptionDocument } from './caption';
describe('captions', () => {
  it('rejects blank and overlapping words', () => {
    expect(() =>
      validateCaptionDocument({
        version: 1,
        languageTag: 'en',
        cues: [
          {
            id: 'c',
            startMs: 0,
            endMs: 100,
            words: [{ id: 'w', text: ' ', startMs: 0, endMs: 50 }],
          },
        ],
      }),
    ).toThrow('INVALID_CAPTION_WORD');
  });
});
