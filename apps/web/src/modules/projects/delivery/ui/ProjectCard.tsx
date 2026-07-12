import type { ProjectCardView } from './project.presentation';
import styles from './ProjectCard.module.css';

export function ProjectCard({
  project,
  onDelete,
}: Readonly<{ project: ProjectCardView; onDelete?: (id: string) => void }>) {
  return (
    <article className={styles.card}>
      <a href={project.href}>
        <h2>{project.name}</h2>
      </a>
      <p className={styles.source}>
        <span aria-hidden="true">●</span> {project.sourceHealthLabel}
      </p>
      <dl className={styles.metrics}>
        <div>
          <dt>Mode</dt>
          <dd>{project.modeLabel}</dd>
        </div>
        <div>
          <dt>Progress</dt>
          <dd>{project.progressLabel}</dd>
        </div>
        {project.etaLabel ? (
          <div>
            <dt>ETA</dt>
            <dd>{project.etaLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt>Candidates</dt>
          <dd>{project.candidateCount ?? '—'}</dd>
        </div>
        <div>
          <dt>Renders</dt>
          <dd>{project.renderCount ?? '—'}</dd>
        </div>
        <div>
          <dt>Spend</dt>
          <dd>{project.spendLabel}</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>
            <time>{project.updatedLabel}</time>
          </dd>
        </div>
      </dl>
      <p className={styles.summary}>
        {project.candidateCount ?? '—'} clips · {project.renderCount ?? '—'}{' '}
        render · {project.spendLabel}
      </p>
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          aria-label={`Delete ${project.name}`}
        >
          Delete
        </button>
      ) : null}
    </article>
  );
}
