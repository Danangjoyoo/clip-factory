import { memo } from 'react';
import styles from './DeleteProjectDialog.module.css';

export type DeleteProjectDialogProps = Readonly<{
  open: boolean;
  projectName: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}>;

function DeleteProjectDialog({
  open,
  projectName,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeleteProjectDialogProps) {
  if (!open) return null;

  return (
    <dialog className={styles.dialog} open>
      <section
        className={styles.content}
        aria-live="polite"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
      >
        <h2 id="delete-title">Delete {projectName}?</h2>
        <p id="delete-description">Local filepath sources are never deleted.</p>
        {error ? (
          <p role="alert" className={styles.alert}>
            {error}
          </p>
        ) : null}
        <footer className={styles.actions}>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={busy}
            onClick={() => {
              void onConfirm();
            }}
          >
            Delete
          </button>
        </footer>
      </section>
    </dialog>
  );
}

export default memo(DeleteProjectDialog);
