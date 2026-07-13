import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

type TranscriptWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptDocument = {
  text: string;
  durationMs: number;
  words: readonly TranscriptWord[];
};

type ArtifactInput = {
  artifactRoot: string;
  bucket: string;
  key: string;
  durationMs: number;
};

const artifactRoot = () =>
  process.env.CLIP_FACTORY_ARTIFACT_ROOT ?? '.clip-factory-artifacts';

const isInside = (path: string, parent: string) =>
  path === parent || path.startsWith(`${parent}${sep}`);

const artifactPath = ({ artifactRoot, bucket, key }: ArtifactInput) => {
  const root = resolve(artifactRoot);
  const path = resolve(root, bucket, key);
  if (!isInside(path, root)) throw new Error('TRANSCRIPT_ARTIFACT_PATH_INVALID');
  return path;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const wordFrom = (value: unknown): TranscriptWord => {
  if (
    !isRecord(value) ||
    typeof value.text !== 'string' ||
    typeof value.startMs !== 'number' ||
    typeof value.endMs !== 'number'
  )
    throw new Error('TRANSCRIPT_ARTIFACT_INVALID');
  return {
    text: value.text,
    startMs: value.startMs,
    endMs: value.endMs,
  };
};

export async function readTranscriptArtifact(
  input: ArtifactInput,
): Promise<TranscriptDocument> {
  const raw = await readFile(artifactPath(input), 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed) || typeof parsed.text !== 'string')
    throw new Error('TRANSCRIPT_ARTIFACT_INVALID');
  if (!Array.isArray(parsed.words))
    throw new Error('TRANSCRIPT_ARTIFACT_INVALID');
  return {
    text: parsed.text,
    durationMs: input.durationMs,
    words: parsed.words.map(wordFrom),
  };
}

export function wordsInDocumentRange(
  document: TranscriptDocument,
  startMs: number,
  endMs: number,
) {
  return document.words.filter(
    (word) => word.endMs > startMs && word.startMs < endMs,
  );
}

export async function loadProjectTranscript(projectId: string) {
  const { prisma } = await import('../../../infrastructure/prisma/client');
  const transcript = await prisma.transcript.findUnique({
    where: { projectId },
    select: {
      objectBucket: true,
      objectKey: true,
      durationMs: true,
    },
  });
  if (!transcript) return null;
  try {
    return await readTranscriptArtifact({
      artifactRoot: artifactRoot(),
      bucket: transcript.objectBucket,
      key: transcript.objectKey,
      durationMs: transcript.durationMs,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error)
      return null;
    throw error;
  }
}

export async function wordsInRange(
  projectId: string,
  startMs: number,
  endMs: number,
) {
  const document = await loadProjectTranscript(projectId);
  return document ? wordsInDocumentRange(document, startMs, endMs) : [];
}
