import type { UsagePresentation } from './usage.presentation';
export function CostSummary({
  summary,
}: {
  summary: UsagePresentation['summary'];
}) {
  return (
    <section aria-label="Cost summary">
      <p>
        <strong>Actual OpenAI spend</strong> {summary.actual}
      </p>
      <p>Allocated estimate {summary.allocated}</p>
      <p>{summary.possible}</p>
      <p>Possible spend is not included in known actual totals.</p>
    </section>
  );
}
