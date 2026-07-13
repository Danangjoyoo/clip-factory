export function ClipUpdateOverlay({
  percent,
  etaLabel,
}: Readonly<{ percent?: number; etaLabel?: string }>) {
  return (
    <div role="status" aria-label="Clip updating">
      <strong>Updating {percent ?? 0}%</strong>
      {etaLabel && <p>{etaLabel}</p>}
    </div>
  );
}
