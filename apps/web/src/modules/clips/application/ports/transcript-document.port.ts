import type { TranscriptWord } from '../services/build-caption-document.service';
export interface TranscriptDocumentPort {
  languageTag(projectId: string): Promise<string>;
  wordsInRange(projectId: string, startMs: number, endMs: number): Promise<readonly TranscriptWord[]>;
}
