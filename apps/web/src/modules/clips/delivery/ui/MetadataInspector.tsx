export type ClipMetadata = {
  origin: 'AI_HIGHLIGHT' | 'MANUAL';
  model?: string;
  reasoning?: string;
  costMicrousd: bigint;
  rank?: number | null;
  score?: number | null;
  algorithmVersion?: string;
};
export function MetadataInspector({
  metadata,
}: Readonly<{ metadata: ClipMetadata }>) {
  const cost = Number(metadata.costMicrousd) / 1_000_000;
  return (
    <dl>
      <dt>Origin</dt>
      <dd>{metadata.origin}</dd>
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
      <dt>Selection cost</dt>
      <dd>
        ${cost.toFixed(2)}{' '}
        {metadata.origin === 'MANUAL' ? 'manual clip' : 'OpenAI selection cost'}
      </dd>
      {metadata.algorithmVersion && (
        <>
          <dt>Algorithm version</dt>
          <dd>{metadata.algorithmVersion}</dd>
        </>
      )}
    </dl>
  );
}
