import type { EditorClip } from './editor.presentation';
import { formatTimecode } from './editor.presentation';
import styles from './VerticalPreview.module.css';
export function VerticalPreview({ clip }: { clip?: EditorClip }) { if (!clip) return <div className={styles.empty} aria-label="Preview">No clip selected</div>; return <div className={styles.preview} aria-label="Preview"><video src={clip.previewUrl} controls muted playsInline aria-label={clip.title ?? 'Clip preview'} /><p>{formatTimecode(clip.startMs)} – {formatTimecode(clip.endMs)}</p></div>; }
