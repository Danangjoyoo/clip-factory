import { describe, expect, it } from 'vitest';
import { BuildCaptionDocumentService } from './build-caption-document.service';
describe('BuildCaptionDocumentService', () => {
  it('clips transcript words to range', () => {
    let n = 0;
    const result = new BuildCaptionDocumentService({
      next: () => `id-${++n}`,
    }).execute({
      languageTag: 'en',
      startMs: 1000,
      endMs: 4000,
      words: [
        { text: 'hello', startMs: 0, endMs: 1200 },
        { text: 'world', startMs: 1300, endMs: 1800 },
      ],
    });
    expect(result.cues[0]?.words[0]?.startMs).toBe(1000);
    expect(result.cues[0]?.words).toHaveLength(2);
  });
});
