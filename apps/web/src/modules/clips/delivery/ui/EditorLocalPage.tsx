'use client';

import { useState } from 'react';
import { addClip } from '../http/clip-api.client';
import { EditorShell } from './EditorShell';
import { useEditor } from './use-editor';
import type { EditorClip } from './editor.presentation';

type TranscriptView = {
  text: string;
  downloadHref: string;
};

const defaultTranscript: TranscriptView = {
  text: 'Transcript is not ready yet.',
  downloadHref: '#',
};

function apiClipToEditorClip(value: {
  id: string;
  title?: string | null;
  startMs: number;
  endMs: number;
  state?: string;
  origin?: string;
  rank?: number | null;
}): EditorClip {
  return {
    id: value.id,
    title: value.title ?? null,
    startMs: value.startMs,
    endMs: value.endMs,
    sourceDurationMs: Math.max(value.endMs, 60_000),
    ...(value.state !== undefined ? { state: value.state } : {}),
    ...(value.origin !== undefined ? { origin: value.origin } : {}),
    ...(value.rank !== undefined ? { rank: value.rank } : {}),
  };
}

export function EditorLocalPage({
  projectId = '',
  initialClips = [],
  transcript = defaultTranscript,
}: {
  projectId?: string;
  initialClips?: EditorClip[];
  transcript?: TranscriptView;
}) {
  const editor = useEditor(initialClips);
  const [tab, setTab] = useState<'clips' | 'transcript'>('clips');
  const addManualClip = async (startMs?: number, endMs?: number) => {
    if (!projectId || startMs === undefined || endMs === undefined) return;
    const clip = await addClip(projectId, { startMs, endMs });
    editor.addClip(apiClipToEditorClip(clip));
  };

  return (
    <>
      <div role="tablist" aria-label="Editor tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'clips'}
          onClick={() => setTab('clips')}
        >
          Clip editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'transcript'}
          onClick={() => setTab('transcript')}
        >
          Transcript
        </button>
      </div>
      {tab === 'clips' ? (
        <EditorShell
          clips={editor.clips}
          {...(editor.selectedClipId
            ? { selectedClipId: editor.selectedClipId }
            : {})}
          onSelect={editor.selectClip}
          onAddClip={addManualClip}
          onRenderSelected={() => undefined}
          onRenderAll={() => undefined}
        />
      ) : (
        <main aria-label="Transcript">
          <header>
            <h1>Transcript</h1>
            <a href={transcript.downloadHref} download>
              Download transcript
            </a>
          </header>
          <p>{transcript.text}</p>
        </main>
      )}
    </>
  );
}
