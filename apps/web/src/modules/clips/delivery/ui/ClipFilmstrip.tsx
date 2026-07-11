'use client';
import type { EditorClip } from './editor.presentation';
import styles from './ClipFilmstrip.module.css';
export function ClipFilmstrip({
  clips,
  selectedClipId,
  onSelect,
  onAddClip,
}: {
  clips: EditorClip[];
  selectedClipId?: string;
  onSelect: (id: string) => void;
  onAddClip: () => void;
}) {
  return (
    <nav className={styles.list} aria-label="Clips">
      {clips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={selectedClipId === c.id ? styles.selected : ''}
          aria-current={selectedClipId === c.id}
          onClick={() => onSelect(c.id)}
        >
          <strong>{c.title ?? `Clip ${c.rank ?? ''}`}</strong>
          <span>
            {c.origin ?? 'MANUAL'} · {c.state ?? 'READY'}
          </span>
        </button>
      ))}
      <button type="button" onClick={onAddClip}>
        Add Clip
      </button>
    </nav>
  );
}
