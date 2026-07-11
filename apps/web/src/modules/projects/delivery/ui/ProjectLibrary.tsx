import { useRef, useState } from 'react';
import ProjectCard from './ProjectCard';
import DeleteProjectDialog from './DeleteProjectDialog';
import type { ProjectCardView } from './project.presentation';
import styles from './ProjectLibrary.module.css';

type Props = Readonly<{
  projects: readonly ProjectCardView[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => Promise<void> | void;
  onDelete: (projectId: string) => Promise<void>;
}>;

export default function ProjectLibrary({
  projects,
  isLoading,
  error,
  onRetry,
  onDelete,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const focusedDeleteButton = useRef<HTMLButtonElement | null>(null);
  const targetProject =
    deletingId !== null
      ? projects.find((project) => project.id === deletingId) ?? null
      : null;
  const hasProjects = projects.length > 0;

  const restoreFocus = () => {
    const requestedButton = focusedDeleteButton.current;
    if (requestedButton && document.body.contains(requestedButton)) {
      requestedButton.focus();
      return;
    }
    const fallback = document.querySelector<HTMLButtonElement>(
      'main[aria-label="Projects"] button',
    );
    fallback?.focus();
  };

  const onDeleteRequest = (projectId: string, button: HTMLButtonElement | null) => {
    focusedDeleteButton.current = button;
    setDeletingId(projectId);
    setDeleteError(null);
  };

  const onCancelDelete = () => {
    setDeletingId(null);
    setDeleteError(null);
    restoreFocus();
  };

  const onConfirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await onDelete(deletingId);
      setDeletingId(null);
      restoreFocus();
    } catch (error) {
      setDeleteError(
        error instanceof Error && error.message ? error.message : 'Unable to delete.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.library} aria-label="Projects">
      <header className={styles.header}>
        <div>
          <h1>Projects</h1>
          <p>Local video projects and processing status.</p>
        </div>
        <a href="/projects/new">New project</a>
      </header>

      {isLoading && !error ? (
        <section aria-live="polite">
          <p>Loading projects…</p>
        </section>
      ) : null}

      {error ? (
        <section aria-live="polite">
          <p className={styles.error}>Failed to load projects.</p>
          <p>{error}</p>
          <button type="button" onClick={() => void onRetry()}>
            Retry
          </button>
        </section>
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <section aria-labelledby="empty-title">
          <h2 id="empty-title">No projects yet</h2>
          <a href="/projects/new">Create your first project</a>
        </section>
      ) : null}

      {error ? null : hasProjects ? (
        <ul className={styles.grid} aria-label="Project library">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                onDeleteRequest={onDeleteRequest}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <DeleteProjectDialog
        open={deletingId !== null}
        projectName={targetProject?.name ?? ''}
        busy={busy}
        error={deleteError}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </main>
  );
}
