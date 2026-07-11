import type { ProjectCardView } from './project.presentation';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectLibrary.module.css';

export function ProjectLibrary({ projects, onDelete }: Readonly<{ projects: readonly ProjectCardView[]; onDelete: (id: string) => void }>) {
  return <main className={styles.library} aria-label="Projects">
    <header className={styles.header}><div><h1>Projects</h1><p>Local video projects and processing status.</p></div><a href="/projects/new">New project</a></header>
    {projects.length === 0 ? <section aria-labelledby="empty-title"><h2 id="empty-title">No projects yet</h2><a href="/projects/new">Create your first project</a></section> : <ul aria-label="Project library">{projects.map((project) => <li key={project.id}><ProjectCard project={project} onDelete={onDelete} /></li>)}</ul>}
  </main>;
}
