import type { Stage } from './processing.presentation';
export function StageTimeline({ stages }: { stages: Stage[] }) {
  return (
    <ol aria-label="Processing stages">
      {stages.map((s) => (
        <li key={s.name} data-status={s.status}>
          {s.status === 'complete' ? '✓ ' : s.status === 'running' ? '● ' : ''}
          {s.name}
        </li>
      ))}
    </ol>
  );
}
