import type { ProcessingPresentation } from './processing.presentation';
import { StageTimeline } from './StageTimeline';
import { BudgetActions } from './BudgetActions';
import { UncertainPaidCallPanel } from './UncertainPaidCallPanel';
import { SanitizedLogList } from './SanitizedLogList';
import styles from './ProcessingView.module.css';

const stateLabel = {
  RUNNING: 'ANALYZING',
  AWAITING_BUDGET: 'BUDGET NEEDED',
  PAID_CALL_UNCERTAIN: 'CHECK SPEND',
  AWAITING_REVIEW: 'READY TO REVIEW',
  COMPLETED: 'COMPLETE',
  FAILED: 'FAILED',
};

const fallbackStages = [
  { name: 'Prepare source', status: 'complete' as const },
  { name: 'Transcribe', status: 'complete' as const },
  { name: 'Verify budget', status: 'complete' as const },
  { name: 'Rank highlights', status: 'running' as const },
  { name: 'Ready for review', status: 'pending' as const },
];

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
  const stages = value.stages.length > 0 ? value.stages : fallbackStages;
  const percent = running
    ? value.percent
    : value.state === 'COMPLETED'
      ? 100
      : 0;
  const currentStage = value.stage ?? 'Waiting for a worker';

  return (
    <section className={styles.runSheet} aria-label="Processing run sheet">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ANALYSIS RUN</p>
          <h1>Finding the strongest moments.</h1>
          <p>We will pause before any paid work that can exceed your limit.</p>
        </div>
        <span className={styles.status}>{stateLabel[value.state]}</span>
      </header>
      <div className={styles.grid}>
        <section className={styles.panel} aria-label="Current stage">
          <div className={styles.summary}>
            <strong>{percent}%</strong>
            <div>
              <h2>{currentStage}</h2>
              <p>{value.eta ?? 'ETA pending'}</p>
            </div>
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label={`${currentStage} progress`}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent}%` }} />
            <b>{percent}%</b>
          </div>
          <StageTimeline stages={stages} />
        </section>
        <aside className={styles.panel} aria-label="Run details">
          <p className={styles.panelTitle}>RUN DETAILS</p>
          <section
            className={styles.estimate}
            aria-label="Estimated completion"
          >
            <strong>{value.eta ?? 'Estimated finish pending'}</strong>
            <p>ETA is based on completed worker-stage timings.</p>
          </section>
          {!value.workerOnline && (
            <p className={styles.offline} role="status">
              Worker offline - job remains queued
            </p>
          )}
          <dl className={styles.metrics}>
            <div>
              <dt>Budget guard</dt>
              <dd>
                {value.state === 'AWAITING_BUDGET'
                  ? 'Approval needed'
                  : 'Active'}
              </dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{value.analysisVersion || 'Pending'}</dd>
            </div>
            <div>
              <dt>Run ID</dt>
              <dd>{value.analysisId || 'Pending'}</dd>
            </div>
          </dl>
          <section aria-label="Budget">
            {value.state === 'AWAITING_BUDGET' ? (
              <BudgetActions {...(cancel ? { onCancel: cancel } : {})} />
            ) : (
              <p>No budget action is needed.</p>
            )}
          </section>
          <section className={styles.controls} aria-label="Processing controls">
            <button
              type="button"
              disabled={!actions.pause}
              onClick={actions.pause}
            >
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
              Cancel run
            </button>
            <a href={`/projects/${value.projectId}/clips`}>
              View local results
            </a>
          </section>
          {value.state === 'PAID_CALL_UNCERTAIN' && (
            <UncertainPaidCallPanel
              possibleSpend={value.possibleSpend ?? 'Possible spend unknown'}
              onAuthorize={actions.retry ?? (() => undefined)}
              onAbandon={actions.abandon ?? (() => undefined)}
            />
          )}
          <section className={styles.logs} aria-label="Sanitized worker logs">
            <SanitizedLogList logs={value.logs} />
          </section>
        </aside>
      </div>
    </section>
  );
}
