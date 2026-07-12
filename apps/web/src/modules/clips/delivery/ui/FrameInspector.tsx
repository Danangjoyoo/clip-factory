import { useState } from 'react';
type Point = { xMicros: number; yMicros: number };
export function FrameInspector({
  value,
  onChange,
  onReset,
}: Readonly<{
  value: Point | null;
  onChange: (point: Point) => void;
  onReset: () => void;
}>) {
  const [error, setError] = useState('');
  const nudge = (axis: 'xMicros' | 'yMicros', amount: number) => {
    const next = value ?? { xMicros: 500_000, yMicros: 500_000 };
    onChange({
      ...next,
      [axis]: Math.max(0, Math.min(1_000_000, next[axis] + amount)),
    });
  };
  return (
    <section
      aria-label="Frame inspector"
      tabIndex={0}
      onKeyDown={(event) => {
        const amount = event.shiftKey ? 10_000 : 1_000;
        if (event.key === 'ArrowLeft') nudge('xMicros', -amount);
        if (event.key === 'ArrowRight') nudge('xMicros', amount);
        if (event.key === 'ArrowUp') nudge('yMicros', -amount);
        if (event.key === 'ArrowDown') nudge('yMicros', amount);
      }}
    >
      <h3>Reframe & focal point</h3>
      <p>{value ? 'Manual focal point' : 'Automatic focal point'}</p>
      <button
        type="button"
        onClick={() => {
          onChange({ xMicros: 500_000, yMicros: 500_000 });
          setError('');
        }}
      >
        Center focal point
      </button>
      <button type="button" onClick={onReset}>
        Reset automatic
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
