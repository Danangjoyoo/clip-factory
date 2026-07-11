import {
  validateCaptionDocument,
  type CaptionDocumentV1,
  type CaptionWord,
} from '../../domain/caption';

export interface IdGenerator {
  next(): string;
}
export interface TranscriptWord {
  readonly id?: string;
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
}

export class BuildCaptionDocumentService {
  constructor(private readonly ids: IdGenerator) {}
  execute(input: {
    languageTag: string;
    words: readonly TranscriptWord[];
    startMs: number;
    endMs: number;
    maxWordsPerLine?: number;
    maxCueDurationMs?: number;
  }): CaptionDocumentV1 {
    const maxWords = input.maxWordsPerLine ?? 6;
    const maxDuration = input.maxCueDurationMs ?? 2500;
    if (
      input.startMs < 0 ||
      input.endMs <= input.startMs ||
      maxWords < 1 ||
      maxDuration < 1
    )
      throw new Error('INVALID_CLIP_RANGE');
    const selected = input.words
      .filter(
        (word) => word.endMs > input.startMs && word.startMs < input.endMs,
      )
      .sort((a, b) => a.startMs - b.startMs)
      .map(
        (word) =>
          ({
            id: word.id ?? this.ids.next(),
            text: word.text.trim(),
            startMs: Math.max(input.startMs, word.startMs),
            endMs: Math.min(input.endMs, word.endMs),
          }) satisfies CaptionWord,
      );
    if (selected.some((word) => !word.text || word.endMs <= word.startMs))
      throw new Error('INVALID_CAPTION_WORD');
    const cues: Array<CaptionDocumentV1['cues'][number]> = [];
    for (const word of selected) {
      const current = cues[cues.length - 1];
      if (
        current &&
        current.words.length < maxWords &&
        word.endMs - current.startMs <= maxDuration
      ) {
        cues[cues.length - 1] = {
          ...current,
          endMs: word.endMs,
          words: [...current.words, word],
        };
      } else
        cues.push({
          id: this.ids.next(),
          startMs: word.startMs,
          endMs: word.endMs,
          words: [word],
        });
    }
    return validateCaptionDocument({
      version: 1,
      languageTag: input.languageTag,
      cues,
    });
  }
}
