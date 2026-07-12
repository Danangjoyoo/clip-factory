export type ClipMetadata = {
  origin?: 'AI_HIGHLIGHT' | 'MANUAL';
  model?: string;
  reasoning?: string;
  costMicrousd?: bigint;
  rank?: number | null;
  score?: number | null;
  algorithmVersion?: string;
  rangeLabel?: string;
  language?: string;
  inheritedFrame?: string;
};
export function MetadataInspector({
  metadata,
}: Readonly<{ metadata: ClipMetadata }>) {
  const cost = metadata.costMicrousd == null ? null : Number(metadata.costMicrousd) / 1_000_000;
  return (
    <dl>
      <dt>Origin</dt>
      <dd>{metadata.origin ?? 'Not available'}</dd>
      {metadata.model && (
        <>
          <dt>Model</dt>
          <dd>{metadata.model}</dd>
        </>
      )}
      {metadata.reasoning && (
        <>
          <dt>Reasoning</dt>
          <dd>{metadata.reasoning}</dd>
        </>
      )}
      {metadata.rank != null && (
        <>
          <dt>Rank</dt>
          <dd>{metadata.rank}</dd>
        </>
      )}
      {metadata.score != null && (
        <>
          <dt>Score</dt>
          <dd>{metadata.score}</dd>
        </>
      )}
      {metadata.rangeLabel && (
        <>
          <dt>Range</dt>
          <dd>{metadata.rangeLabel}</dd>
        </>
      )}
      {metadata.language && (
        <>
          <dt>Language</dt>
          <dd>{metadata.language}</dd>
        </>
      )}
      {metadata.inheritedFrame && (
        <>
          <dt>Inherited frame</dt>
          <dd>{metadata.inheritedFrame}</dd>
        </>
      )}
      <dt>Selection cost</dt>
      <dd>{cost == null ? 'Not available' : `$${cost.toFixed(2)}`}</dd>
      {metadata.algorithmVersion && (
        <>
          <dt>Algorithm version</dt>
          <dd>{metadata.algorithmVersion}</dd>
        </>
      )}
    </dl>
  );
}
