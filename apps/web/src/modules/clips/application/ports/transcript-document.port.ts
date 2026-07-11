import type { TranscriptWord } from '../services/build-caption-document.service';

export interface TranscriptDocumentPort {
  wordsInRange(
    projectId: string,
    startMs: number,
    endMs: number,
  ): Promise<readonly TranscriptWord[]>;
}
