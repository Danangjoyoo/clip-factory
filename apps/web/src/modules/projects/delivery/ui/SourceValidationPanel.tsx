const messages = {
  SOURCE_NOT_FOUND: 'The source could not be found. Replace it to continue.',
  SOURCE_CHANGED: 'The source changed. Replace it to continue.',
  SOURCE_NOT_ALLOWED:
    'The source is no longer available. Replace it to continue.',
} as const;

export type SourceValidationError = keyof typeof messages;

export function SourceValidationPanel({
  title,
  error,
  onReplace,
}: {
  title: string;
  error?: SourceValidationError;
  onReplace?: () => void;
}) {
  return (
    <section aria-label="Source validation">
      <label>
        Project setup
        <input aria-label="Project setup" readOnly value={title} />
      </label>
      {error ? (
        <>
          <p role="alert">{messages[error]}</p>
          <button type="button" onClick={onReplace}>
            Replace source
          </button>
        </>
      ) : (
        <p>Source will be validated before processing.</p>
      )}
    </section>
  );
}
