import type { ProcessingPresentation } from './processing.presentation';
import { StageTimeline } from './StageTimeline';
import { BudgetActions } from './BudgetActions';
import { UncertainPaidCallPanel } from './UncertainPaidCallPanel';
import { SanitizedLogList } from './SanitizedLogList';
import styles from './ProcessingView.module.css';
export function ProcessingView({
  value,
  actions = {},
}: {
  value: ProcessingPresentation;
  actions?: {
    cancel?: () => void;
    pause?: () => void;
    resume?: () => void;
    retry?: (v: { acknowledgePossiblePriorSpend: true }) => void;
    abandon?: () => void;
  };
}) {
  const running =
    value.state === 'RUNNING' && typeof value.percent === 'number';
  const cancel = actions.cancel;
  return (
    <main className={styles.runSheet} aria-label="Processing run sheet">
      <h1>Processing</h1>
      <section aria-label="Current stage">
        <h2>{value.stage ?? 'Waiting for a worker'}</h2>
        <StageTimeline stages={value.stages} />
        {running && (
          <div
            role="progressbar"
            aria-label={`${value.stage ?? 'Processing'} progress`}
            aria-valuenow={value.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {value.percent}%
          </div>
        )}
      </section>
      <section aria-label="Estimated completion">
        {value.eta && value.state === 'RUNNING' ? (
          <p>{value.eta}</p>
        ) : (
          <p>ETA pending</p>
        )}
        <p>ETA is based on completed worker-stage timings.</p>
      </section>
      {!value.workerOnline && (
        <p role="status">Worker offline — job remains queued</p>
      )}
      <section aria-label="Budget">
        {value.state === 'AWAITING_BUDGET' ? (
          <BudgetActions {...(cancel ? { onCancel: cancel } : {})} />
        ) : (
          <p>No budget action is needed.</p>
        )}
      </section>
      <section className={styles.controls} aria-label="Processing controls">
        <button type="button" disabled={!actions.pause} onClick={actions.pause}>
          Pause
        </button>
        <button
          type="button"
          disabled={!actions.resume}
          onClick={actions.resume}
        >
          Resume
        </button>
        <button type="button" disabled={!cancel} onClick={cancel}>
          Cancel
        </button>
      </section>
      {value.state === 'PAID_CALL_UNCERTAIN' && (
        <UncertainPaidCallPanel
          possibleSpend={value.possibleSpend ?? 'Possible spend unknown'}
          onAuthorize={actions.retry ?? (() => undefined)}
          onAbandon={actions.abandon ?? (() => undefined)}
        />
      )}
      <section aria-label="Sanitized worker logs">
        <SanitizedLogList logs={value.logs} />
      </section>
    </main>
  );
}
