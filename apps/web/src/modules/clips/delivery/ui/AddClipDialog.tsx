'use client';
import { useState } from 'react';
export function AddClipDialog({
  open,
  onCancel,
  onAdd,
}: {
  open: boolean;
  onCancel: () => void;
  onAdd: (startMs: number, endMs: number) => void;
}) {
  const [start, setStart] = useState('00:00:00');
  const [end, setEnd] = useState('00:00:10');
  const toMilliseconds = (timecode: string) => {
    if (!/^\d{2}:\d{2}:\d{2}$/.test(timecode)) return NaN;
    const hours = Number(timecode.slice(0, 2));
    const minutes = Number(timecode.slice(3, 5));
    const seconds = Number(timecode.slice(6, 8));
    return minutes < 60 && seconds < 60
      ? ((hours * 60 + minutes) * 60 + seconds) * 1000
      : NaN;
  };
  if (!open) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = toMilliseconds(start),
      n = toMilliseconds(end);
    if (!Number.isFinite(s) || !Number.isFinite(n) || s >= n) return;
    onAdd(s, n);
  };
  const durationMs = toMilliseconds(end) - toMilliseconds(start);
  return (
    <dialog open aria-label="Add Clip" aria-modal="true">
      <form onSubmit={submit}>
        <label>
          Start timecode
          <input
            autoFocus
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          End timecode
          <input value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <p>
          {Number.isFinite(durationMs)
            ? `Range: ${Math.max(0, durationMs / 1000)} seconds`
            : 'Enter HH:MM:SS values'}{' '}
          · Maximum duration: 60 seconds
        </p>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <p>Captions ready from existing transcript</p>
        <button type="submit">Add clip</button>
      </form>
    </dialog>
  );
}
