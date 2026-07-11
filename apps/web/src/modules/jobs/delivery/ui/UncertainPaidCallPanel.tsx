'use client';

import { useState } from 'react';
export function UncertainPaidCallPanel({
  possibleSpend,
  onAuthorize,
  onAbandon,
}: {
  possibleSpend: string;
  onAuthorize: (value: { acknowledgePossiblePriorSpend: true }) => void;
  onAbandon: () => void;
}) {
  const [ok, setOk] = useState(false);
  return (
    <section>
      <div role="alert">
        OpenAI may have charged the previous attempt, but its actual usage is
        unknown. No automatic retry will occur.
      </div>
      <p>{possibleSpend}</p>
      <label>
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
        />{' '}
        I understand the previous attempt may have incurred a separate charge
      </label>
      <button
        disabled={!ok}
        onClick={() => onAuthorize({ acknowledgePossiblePriorSpend: true })}
      >
        Reserve and retry
      </button>
      <button onClick={onAbandon}>Abandon analysis</button>
    </section>
  );
}
