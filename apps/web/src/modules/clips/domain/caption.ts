import { ClipEditError } from './timecode';
export { ClipEditError } from './timecode';

export type CaptionWord = Readonly<{
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}>;
export type CaptionCue = Readonly<{
  id: string;
  startMs: number;
  endMs: number;
  words: readonly CaptionWord[];
}>;
export type CaptionDocumentV1 = Readonly<{
  version: 1;
  languageTag: string;
  cues: readonly CaptionCue[];
}>;

export function validateCaptionDocument(
  document: CaptionDocumentV1,
): CaptionDocumentV1 {
  if (document.version !== 1 || !document.languageTag)
    throw new ClipEditError('INVALID_CAPTION_DOCUMENT');
  let previousEnd = -1;
  for (const cue of document.cues) {
    if (
      !cue.id ||
      cue.startMs < 0 ||
      cue.endMs <= cue.startMs ||
      cue.startMs < previousEnd
    )
      throw new ClipEditError('INVALID_CAPTION_CUE');
    let wordEnd = cue.startMs;
    for (const word of cue.words) {
      if (
        !word.id ||
        !word.text.trim() ||
        word.startMs < cue.startMs ||
        word.endMs > cue.endMs ||
        word.endMs <= word.startMs ||
        word.startMs < wordEnd
      )
        throw new ClipEditError('INVALID_CAPTION_WORD');
      wordEnd = word.endMs;
    }
    previousEnd = cue.endMs;
  }
  return document;
}

export function updateCaptionText(
  document: CaptionDocumentV1,
  updates: Readonly<Record<string, string>>,
): CaptionDocumentV1 {
  const known = new Set(
    document.cues.flatMap((cue) => cue.words.map((word) => word.id)),
  );
  if (Object.keys(updates).some((id) => !known.has(id) || !updates[id]?.trim()))
    throw new ClipEditError('INVALID_CAPTION_WORD');
  return validateCaptionDocument({
    ...document,
    cues: document.cues.map((cue) => ({
      ...cue,
      words: cue.words.map((word) => ({
        ...word,
        text: updates[word.id] ?? word.text,
      })),
    })),
  });
}
