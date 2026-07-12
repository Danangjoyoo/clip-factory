import type { ProjectCardView } from './project.presentation';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectLibrary.module.css';

export function ProjectLibrary({
  projects,
  onDelete,
  heading = 'Projects',
}: Readonly<{
  projects: readonly ProjectCardView[];
  onDelete?: (id: string) => void;
  heading?: string;
}>) {
  return (
    <main className={styles.library} aria-label="Projects">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Project library</p>
          <h1>{heading}</h1>
          <p>Every source, candidate, and export kept in one place.</p>
        </div>
        <a className={styles.primaryAction} href="/projects/new">
          New project
        </a>
      </header>
      <div className={styles.workspace}>
        {projects.length === 0 ? (
          <section className={styles.empty} aria-labelledby="empty-title">
            <h2 id="empty-title">No projects yet</h2>
            <p>Add a local video or upload a file to create a review queue.</p>
            <a href="/projects/new">Create your first project</a>
          </section>
        ) : (
          <ul aria-label="Project library">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard
                  {...(onDelete ? { onDelete } : {})}
                  project={project}
                />
              </li>
            ))}
          </ul>
        )}
        <aside className={styles.side} aria-label="Project guide">
          <section className={styles.metric}>
            <span>Monthly creative spend</span>
            <strong>Tracked per project</strong>
            <div aria-hidden="true" className={styles.meter}>
              <span />
            </div>
            <p>OpenAI analysis spend is capped before paid work starts.</p>
          </section>
          <section className={styles.guide}>
            <span>Start a project</span>
            <ul>
              <li>Add a video file or local path</li>
              <li>Set quality and budget limits</li>
              <li>Review clips before rendering</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
