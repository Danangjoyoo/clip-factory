import { prisma } from '../../../infrastructure/prisma/client';
import { loadProjectTranscript } from '../../transcription/composition/transcript-artifact';
import type { ResultClipView } from '../delivery/ui/ResultsDashboard';
import type { EditorClip } from '../delivery/ui/editor.presentation';

const durationLabel = (startMs: number, endMs: number) => {
  const total = Math.max(0, Math.round((endMs - startMs) / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
    total % 60,
  ).padStart(2, '0')}`;
};

const scoreLabel = (score: unknown) => {
  if (!score || typeof score !== 'object' || !('overall' in score))
    return 'AI highlight';
  const value = Number((score as { overall: unknown }).overall);
  return Number.isFinite(value)
    ? `AI highlight · ${Math.round(value * 100)} score`
    : 'AI highlight';
};

export async function editorView(projectId: string): Promise<{
  projectId: string;
  clips: EditorClip[];
  transcript: { text: string; downloadHref: string };
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      clips: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
      transcript: true,
    },
  });
  const transcript = await loadProjectTranscript(projectId);
  return {
    projectId,
    clips:
      project?.clips.map((clip) => ({
        id: clip.id,
        title: clip.title,
        startMs: clip.startMs,
        endMs: clip.endMs,
        sourceDurationMs:
          project.transcript?.durationMs ?? transcript?.durationMs ?? clip.endMs,
        origin: clip.origin,
        rank: clip.rank,
        score:
          clip.scoreJson && typeof clip.scoreJson === 'object'
            ? Number((clip.scoreJson as { overall?: unknown }).overall ?? 0)
            : null,
        state: clip.state,
        previewState: clip.state === 'FAILED' ? 'FAILED' : 'READY',
        outputFrame: '9:16 · 1080×1920',
      })) ?? [],
    transcript: {
      text: transcript?.text ?? 'Transcript is not ready yet.',
      downloadHref: `/api/projects/${projectId}/transcript`,
    },
  };
}

export async function resultsView(projectId: string): Promise<ResultClipView[]> {
  const clips = await prisma.clip.findMany({
    where: { projectId },
    include: {
      renders: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
  });
  return clips.map((clip) => {
    const render = clip.renders[0];
    const rendered = render?.status === 'COMPLETED';
    return {
      id: clip.id,
      title: clip.title ?? `Clip ${clip.rank ?? ''}`.trim(),
      durationLabel: durationLabel(clip.startMs, clip.endMs),
      state: rendered ? 'RENDERED' : clip.state,
      originLabel:
        clip.origin === 'AI_HIGHLIGHT' ? scoreLabel(clip.scoreJson) : 'Manual',
      sizeLabel: rendered ? 'Local render' : 'Pending',
      formatLabel: 'MP4 · H.264 + AAC · captions stitched',
      ...(rendered
        ? { downloadHref: `/api/projects/${projectId}/downloads/${clip.id}` }
        : {}),
      editorHref: `/projects/${projectId}/editor`,
    };
  });
}
