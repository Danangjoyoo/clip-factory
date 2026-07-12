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
    const [hours, minutes, seconds] = timecode.split(':').map(Number);
    return [hours, minutes, seconds].every(Number.isFinite)
      ? ((hours * 60 + minutes) * 60 + seconds) * 1000
      : NaN;
  };
  if (!open) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = toMilliseconds(start),
      n = toMilliseconds(end);
    if (s >= n) return;
    onAdd(s, n);
  };
  const durationMs = toMilliseconds(end) - toMilliseconds(start);
  return (
    <dialog open aria-label="Add Clip">
      <form onSubmit={submit}>
        <label>
          Start timecode
          <input value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End timecode
          <input value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <p>
          {Number.isFinite(durationMs) ? `Range: ${Math.max(0, durationMs / 1000)} seconds` : 'Enter HH:MM:SS values'} · Maximum duration: 60 seconds
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
