'use client';
import type { EditorClip } from './editor.presentation';
import { ClipFilmstrip } from './ClipFilmstrip';
import { VerticalPreview } from './VerticalPreview';
import { TrimTimeline } from './TrimTimeline';
import { RenderActions } from './RenderActions';
import styles from './EditorShell.module.css';

export type EditorShellProps = { clips: EditorClip[]; selectedClipId?: string; onSelect: (id: string) => void; onAddClip: () => void; onRenderSelected: () => void; onRenderAll: () => void; inspector?: React.ReactNode };
export function EditorShell({ clips, selectedClipId, onSelect, onAddClip, onRenderSelected, onRenderAll, inspector }: EditorShellProps) {
 const selected = clips.find(c => c.id === selectedClipId) ?? clips[0];
 return <main className={styles.shell} aria-label="Clip editor"><section className={styles.filmstrip} aria-label="Clips"><ClipFilmstrip clips={clips} selectedClipId={selected?.id} onSelect={onSelect} onAddClip={onAddClip} /></section><section className={styles.preview} aria-label="Preview"><VerticalPreview clip={selected} /></section><aside className={styles.inspector} aria-label="Inspector">{inspector ?? <><h2>Inspector</h2>{selected && <p>{selected.title ?? 'Untitled clip'}</p>}</>}</aside><section className={styles.timeline} aria-label="Trim timeline">{selected && <TrimTimeline value={{ startMs: selected.startMs, endMs: selected.endMs, sourceDurationMs: selected.sourceDurationMs ?? selected.endMs, maxDurationMs: 60000 }} onChange={() => undefined} />}</section><div className={styles.actions}><RenderActions hasSelection={Boolean(selected)} hasAcceptedClips={clips.some(c => c.state !== 'FAILED')} onRenderSelected={onRenderSelected} onRenderAll={onRenderAll} /></div></main>;
}
