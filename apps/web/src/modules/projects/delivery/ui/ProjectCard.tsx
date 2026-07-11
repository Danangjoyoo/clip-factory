import Link from 'next/link';
import { memo } from 'react';
import type { ProjectCardView } from './project.presentation';
import styles from './ProjectCard.module.css';

const toneClass: Record<ProjectCardView['sourceHealthTone'], string> = {
  neutral: styles.toneneutral ?? '',
  warning: styles.tonewarning ?? '',
  danger: styles.tonedanger ?? '',
};

type Props = Readonly<{
  project: ProjectCardView;
  onDeleteRequest: (projectId: string, button: HTMLButtonElement | null) => void;
}>;

function ProjectCard({ project, onDeleteRequest }: Props) {
  const statusClassName = `${styles.status ?? ''} ${toneClass[project.sourceHealthTone] ?? ''}`.trim();
  return (
    <article className={styles.card}>
      <h2 className={styles.title}>
        <Link href={project.href}>{project.name}</Link>
      </h2>
      <p className={statusClassName}>
        <span aria-hidden="true">●</span>
        <span>{project.sourceHealthLabel}</span>
      </p>
      <p>{project.modeLabel}</p>
      <p>{project.progressLabel}</p>
      {project.etaLabel ? <p>{project.etaLabel}</p> : null}
      <p>
        {project.candidateCount} clips · {project.renderCount} render ·{' '}
        {project.spendLabel}
      </p>
      <footer className={styles.footer}>
        <time>{project.updatedLabel}</time>
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`Delete ${project.name}`}
          onClick={(event) => onDeleteRequest(project.id, event.currentTarget)}
        >
          Delete
        </button>
      </footer>
    </article>
  );
}

export default memo(ProjectCard);
