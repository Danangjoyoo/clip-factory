import { useState } from 'react';
export function BudgetActions({
  onRaiseCap,
  onRange,
  onCancel,
}: {
  onRaiseCap?: (cap: number) => void;
  onRange?: (start: string, end: string) => void;
  onCancel?: () => void;
}) {
  const [cap, setCap] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  return (
    <section aria-label="Budget actions">
      <label>
        New cap{' '}
        <input
          type="number"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
        />
      </label>
      <button onClick={() => onRaiseCap?.(Number(cap))}>Raise cap</button>
      <label>
        Start{' '}
        <input
          type="text"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        End{' '}
        <input
          type="text"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <button onClick={() => onRange?.(start, end)}>
        Use a contiguous time range
      </button>
      <button onClick={onCancel}>Cancel analysis</button>
    </section>
  );
}
