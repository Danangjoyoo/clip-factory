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
import { formatTimecode } from './editor.presentation';
import styles from './EditorShell.module.css';

export type EditorShellProps = {
  clips: EditorClip[];
  selectedClipId?: string;
  onSelect: (id: string) => void;
  onAddClip: (startMs?: number, endMs?: number) => void;
  onRenderSelected: () => void;
  onRenderAll: () => void;
  projectOutputFrame?: string;
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
  projectOutputFrame,
  inspector,
  onTrimChange,
}: EditorShellProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<
    'captions' | 'frame' | 'metadata'
  >('captions');
  const [focalPoint, setFocalPoint] = useState<{
    xMicros: number;
    yMicros: number;
  } | null>(null);
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
        <header className={styles.topbar}>
          <div>
            <span>Clip editor</span>
            <strong>{selected?.title ?? 'No clip selected'}</strong>
          </div>
          <RenderActions
            hasSelection={Boolean(selected)}
            selectedIsUpdating={selected?.previewState === 'UPDATING'}
            hasAcceptedClips={clips.some((clip) => clip.state !== 'FAILED')}
            onRenderSelected={onRenderSelected}
            onRenderAll={onRenderAll}
          />
        </header>
        <section className={styles.filmstrip} aria-label="Clips">
          <span className={styles.label}>CANDIDATES</span>
          <ClipFilmstrip
            clips={clips}
            {...(selected ? { selectedClipId: selected.id } : {})}
            onSelect={onSelect}
            onAddClip={() => setAddOpen(true)}
          />
        </section>
        <section className={styles.preview} aria-label="Preview">
          <div className={styles.stagehead}>
            <span>{selected?.title ?? 'Select a clip'}</span>
            <span>
              {selected
                ? `${formatTimecode(selected.startMs)} - ${formatTimecode(
                    selected.endMs,
                  )}`
                : 'No range selected'}
            </span>
          </div>
          <VerticalPreview {...(selected ? { clip: selected } : {})} />
          {selected?.previewState === 'UPDATING' && (
            <ClipUpdateOverlay
              {...(selected.previewPercent !== undefined
                ? { percent: selected.previewPercent }
                : {})}
              {...(selected.previewEtaLabel !== undefined
                ? { etaLabel: selected.previewEtaLabel }
                : {})}
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
              {selected && (
                <div className={styles.provenanceSummary}>
                  <strong>{selected.title ?? 'Untitled clip'}</strong>
                  <p>
                    Output frame:{' '}
                    {selected.outputFrame ??
                      projectOutputFrame ??
                      'Not available'}
                  </p>
                  <p>
                    Source range: {selected.startMs}–{selected.endMs} ms
                  </p>
                </div>
              )}
              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Inspector tabs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === 'captions'}
                  onClick={() => setInspectorTab('captions')}
                >
                  Captions
                </button>
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
              {inspectorTab === 'captions' ? (
                <section
                  className={styles.captionPanel}
                  aria-label="Caption inspector"
                >
                  <span className={styles.label}>CAPTION STYLE</span>
                  <label>
                    Font
                    <select aria-label="Caption font" defaultValue="Inter">
                      <option>Inter</option>
                      <option>System</option>
                    </select>
                  </label>
                  <label>
                    Words per line
                    <input
                      aria-label="Words per line"
                      type="number"
                      min="1"
                      max="8"
                      defaultValue="4"
                    />
                  </label>
                  <div className={styles.chips} aria-label="Active-word color">
                    <button type="button" aria-pressed="true">
                      Cyan
                    </button>
                    <button type="button">Yellow</button>
                    <button type="button">White</button>
                  </div>
                </section>
              ) : null}
              {inspectorTab === 'frame' ? (
                <FrameInspector
                  value={focalPoint}
                  onChange={setFocalPoint}
                  onReset={() => setFocalPoint(null)}
                />
              ) : inspectorTab === 'metadata' ? (
                <MetadataInspector
                  metadata={{
                    ...(selected?.origin === 'AI_HIGHLIGHT' ||
                    selected?.origin === 'MANUAL'
                      ? { origin: selected.origin }
                      : {}),
                    ...(selected?.model !== undefined
                      ? { model: selected.model }
                      : {}),
                    ...(selected?.reasoning !== undefined
                      ? { reasoning: selected.reasoning }
                      : {}),
                    ...(selected?.costMicrousd !== undefined
                      ? { costMicrousd: selected.costMicrousd }
                      : {}),
                    ...(selected?.rank !== undefined
                      ? { rank: selected.rank }
                      : {}),
                    ...(selected?.score !== undefined
                      ? { score: selected.score }
                      : {}),
                    ...(selected
                      ? {
                          rangeLabel: `${selected.startMs}–${selected.endMs} ms`,
                        }
                      : {}),
                    ...(selected?.language !== undefined
                      ? { language: selected.language }
                      : {}),
                    ...(selected?.inheritedFrame !== undefined
                      ? { inheritedFrame: selected.inheritedFrame }
                      : {}),
                  }}
                />
              ) : null}
            </>
          )}
        </aside>
      </main>
      <AddClipDialog
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onAdd={add}
      />
    </>
  );
}
