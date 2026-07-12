'use client';

import { useState } from 'react';
import type { EditorClip } from './editor.presentation';
import { AddClipDialog } from './AddClipDialog';
import { ClipFilmstrip } from './ClipFilmstrip';
import { ClipUpdateOverlay } from './ClipUpdateOverlay';
import { FrameInspector } from './FrameInspector';
import { MetadataInspector } from './MetadataInspector';
import { RenderActions } from './RenderActions';
import { TrimTimeline } from './TrimTimeline';
import { VerticalPreview } from './VerticalPreview';
import styles from './EditorShell.module.css';

export type EditorShellProps = {
  clips: EditorClip[];
  selectedClipId?: string;
  onSelect: (id: string) => void;
  onAddClip: (startMs?: number, endMs?: number) => void;
  onRenderSelected: () => void;
  onRenderAll: () => void;
  inspector?: React.ReactNode;
  onTrimChange?: (
    id: string,
    range: { startMs: number; endMs: number },
  ) => void;
};

export function EditorShell({
  clips,
  selectedClipId,
  onSelect,
  onAddClip,
  onRenderSelected,
  onRenderAll,
  inspector,
  onTrimChange,
}: EditorShellProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'frame' | 'metadata'>('frame');
  const [focalPoint, setFocalPoint] = useState<{ xMicros: number; yMicros: number } | null>(null);
  const selected = clips.find((clip) => clip.id === selectedClipId) ?? clips[0];
  const add = (startMs: number, endMs: number) => {
    setAddOpen(false);
    onAddClip(startMs, endMs);
  };
  const trim = (range: { startMs: number; endMs: number }) => {
    if (selected) onTrimChange?.(selected.id, range);
  };

  return (
    <>
      <main className={styles.shell} aria-label="Clip editor">
        <section className={styles.filmstrip} aria-label="Clips">
          <ClipFilmstrip
            clips={clips}
            {...(selected ? { selectedClipId: selected.id } : {})}
            onSelect={onSelect}
            onAddClip={() => setAddOpen(true)}
          />
        </section>
        <section className={styles.preview} aria-label="Preview">
          <VerticalPreview {...(selected ? { clip: selected } : {})} />
          {selected?.previewState === 'UPDATING' && (
            <ClipUpdateOverlay
              percent={selected.previewPercent}
              etaLabel={selected.previewEtaLabel}
            />
          )}
        </section>
        <section className={styles.timeline} aria-label="Trim timeline">
          {selected && (
            <TrimTimeline
              value={{
                startMs: selected.startMs,
                endMs: selected.endMs,
                sourceDurationMs: selected.sourceDurationMs ?? selected.endMs,
                maxDurationMs: 60000,
              }}
              onChange={trim}
            />
          )}
        </section>
        <aside className={styles.inspector} aria-label="Inspector">
          {inspector ?? (
            <>
              <h2>Inspector</h2>
              {selected && (
                <>
                  <p>{selected.title ?? 'Untitled clip'}</p>
                  <p>9:16 · 1080×1920</p>
                  <p>
                    Source range: {selected.startMs}–{selected.endMs} ms
                  </p>
                </>
              )}
              <div role="tablist" aria-label="Inspector tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'frame'}
                  onClick={() => setInspectorTab('frame')}
                >
                  Frame
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'metadata'}
                  onClick={() => setInspectorTab('metadata')}
                >
                  Metadata
                </button>
              </div>
              {inspectorTab === 'frame' ? (
                <FrameInspector
                  value={focalPoint}
                  onChange={setFocalPoint}
                  onReset={() => setFocalPoint(null)}
                />
              ) : (
                <MetadataInspector
                  metadata={{
                    origin: selected?.origin === 'AI_HIGHLIGHT' ? 'AI_HIGHLIGHT' : 'MANUAL',
                    costMicrousd: 0n,
                    rank: selected?.rank,
                    rangeLabel: selected ? `${selected.startMs}–${selected.endMs} ms` : undefined,
                    inheritedFrame: focalPoint ? 'Manual focal point' : 'Automatic focal point',
                  }}
                />
              )}
            </>
          )}
        </aside>
        <div className={styles.actions}>
          <RenderActions
            hasSelection={Boolean(selected)}
            selectedIsUpdating={selected?.previewState === 'UPDATING'}
            hasAcceptedClips={clips.some((clip) => clip.state !== 'FAILED')}
            onRenderSelected={onRenderSelected}
            onRenderAll={onRenderAll}
          />
        </div>
      </main>
      <AddClipDialog
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onAdd={add}
      />
    </>
  );
}
