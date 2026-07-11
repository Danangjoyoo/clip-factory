import type { ProjectCardView } from './project.presentation';
import styles from './ProjectCard.module.css';

export function ProjectCard({ project, onDelete }: Readonly<{ project: ProjectCardView; onDelete: (id: string) => void }>) {
  return <article className={styles.card}>
    <a href={project.href}><h2>{project.name}</h2></a>
    <p><span aria-hidden="true">●</span> {project.sourceHealthLabel}</p>
    <p>{project.modeLabel}</p><p>{project.progressLabel}</p>
    {project.etaLabel ? <p>{project.etaLabel}</p> : null}
    <p>{project.candidateCount} clips · {project.renderCount} render · {project.spendLabel}</p>
    <time>{project.updatedLabel}</time>
    <button type="button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`}>Delete</button>
  </article>;
}
