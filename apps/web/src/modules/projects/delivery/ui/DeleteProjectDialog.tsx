export function DeleteProjectDialog({
  open,
  projectName,
  busy,
  error,
  onCancel,
  onConfirm,
}: Readonly<{
  open: boolean;
  projectName: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  if (!open) return null;
  return (
    <dialog open aria-labelledby="delete-title" aria-describedby="delete-copy">
      <h2 id="delete-title">Delete {projectName}?</h2>
      <p id="delete-copy">Local filepath sources are never deleted.</p>
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <button type="button" onClick={onConfirm} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </dialog>
  );
}
