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
  const [start, setStart] = useState('0');
  const [end, setEnd] = useState('10');
  if (!open) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(start),
      n = Number(end);
    if (s >= n) return;
    onAdd(s * 1000, n * 1000);
  };
  return (
    <dialog open aria-label="Add Clip">
      <form onSubmit={submit}>
        <label>
          Start
          <input value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          <input value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Add</button>
      </form>
    </dialog>
  );
}
