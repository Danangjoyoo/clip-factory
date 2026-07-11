'use client';
import { useState } from 'react';
import { formatTimecode } from './editor.presentation';
import styles from './TrimTimeline.module.css';
export type TrimValue = {
  startMs: number;
  endMs: number;
  sourceDurationMs: number;
  maxDurationMs: number;
};
export function TrimTimeline({
  value,
  activeBoundary = 'end',
  onChange,
}: {
  value: TrimValue;
  activeBoundary?: 'start' | 'end';
  onChange: (v: Pick<TrimValue, 'startMs' | 'endMs'>) => void;
}) {
  const [boundary, setBoundary] = useState(activeBoundary);
  const move = (delta: number) => {
    const next =
      boundary === 'start'
        ? Math.max(0, Math.min(value.startMs + delta, value.endMs - 1))
        : Math.min(
            value.sourceDurationMs,
            Math.max(value.endMs + delta, value.startMs + 1),
          );
    onChange(
      boundary === 'start'
        ? { startMs: next, endMs: value.endMs }
        : { startMs: value.startMs, endMs: next },
    );
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey
      ? 100
      : e.key === 'PageUp' || e.key === 'PageDown'
        ? 1000
        : 10;
    if (e.key === 'ArrowLeft' || e.key === 'PageDown') {
      e.preventDefault();
      move(-step);
    }
    if (e.key === 'ArrowRight' || e.key === 'PageUp') {
      e.preventDefault();
      move(step);
    }
  };
  return (
    <div className={styles.timeline}>
      <label>
        Clip start
        <input
          aria-label="Clip start"
          type="range"
          min="0"
          max={value.sourceDurationMs}
          value={value.startMs}
          onFocus={() => setBoundary('start')}
          onKeyDown={key}
          onChange={(e) =>
            onChange({ startMs: Number(e.target.value), endMs: value.endMs })
          }
          aria-valuetext={formatTimecode(value.startMs)}
        />
      </label>
      <label>
        Clip end
        <input
          aria-label="Clip end"
          type="range"
          min="0"
          max={value.sourceDurationMs}
          value={value.endMs}
          onFocus={() => setBoundary('end')}
          onKeyDown={key}
          onChange={(e) =>
            onChange({ startMs: value.startMs, endMs: Number(e.target.value) })
          }
          aria-valuetext={formatTimecode(value.endMs)}
        />
      </label>
    </div>
  );
}
