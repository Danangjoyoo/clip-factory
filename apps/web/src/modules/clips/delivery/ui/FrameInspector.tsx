import { useState } from 'react';
type Point = { xMicros: number; yMicros: number };
export function FrameInspector({ value, onChange, onReset }: Readonly<{ value: Point | null; onChange: (point: Point) => void; onReset: () => void }>) {
  const [error, setError] = useState('');
  return <section><p>{value ? 'Manual focal point' : 'Automatic focal point'}</p><button type="button" onClick={() => { onChange({ xMicros: 500_000, yMicros: 500_000 }); setError(''); }}>Center focal point</button><button type="button" onClick={onReset}>Reset automatic</button>{error && <p role="alert">{error}</p>}</section>;
}
