import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readTranscriptArtifact,
  wordsInDocumentRange,
} from './transcript-artifact';

let root: string | null = null;

describe('transcript artifact reader', () => {
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = null;
  });

  it('loads text and words from the persisted worker transcript JSON', async () => {
    root = await mkdtemp(join(tmpdir(), 'clip-factory-transcript-'));
    const key = 'projects/project-1/transcripts/transcript.v1.json';
    await mkdir(join(root, 'clip-factory', 'projects/project-1/transcripts'), {
      recursive: true,
    });
    await writeFile(
      join(root, 'clip-factory', key),
      JSON.stringify({
        text: 'Real transcript text.',
        words: [
          { text: 'Real', startMs: 0, endMs: 300, confidenceMicros: 900000 },
          { text: 'transcript', startMs: 400, endMs: 900 },
        ],
        segments: [],
      }),
    );

    const document = await readTranscriptArtifact({
      artifactRoot: root,
      bucket: 'clip-factory',
      key,
      durationMs: 1000,
    });

    expect(document).toEqual({
      text: 'Real transcript text.',
      durationMs: 1000,
      words: [
        { text: 'Real', startMs: 0, endMs: 300 },
        { text: 'transcript', startMs: 400, endMs: 900 },
      ],
    });
    expect(wordsInDocumentRange(document, 350, 950)).toEqual([
      { text: 'transcript', startMs: 400, endMs: 900 },
    ]);
  });

  it('rejects artifact paths outside the artifact root', async () => {
    root = await mkdtemp(join(tmpdir(), 'clip-factory-transcript-'));

    await expect(
      readTranscriptArtifact({
        artifactRoot: root,
        bucket: '..',
        key: 'outside.json',
        durationMs: 0,
      }),
    ).rejects.toThrow('TRANSCRIPT_ARTIFACT_PATH_INVALID');
  });
});
