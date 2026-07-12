import type { ChangeEvent } from 'react';
export function SourceMethodFields({
  method,
  path,
  file,
  onMethod,
  onPath,
  onFile,
}: {
  method: string;
  path: string;
  file: File | null;
  onMethod: (value: 'FILEPATH' | 'UPLOAD') => void;
  onPath: (value: string) => void;
  onFile: (file: File | null) => void;
}) {
  const change = (event: ChangeEvent<HTMLInputElement>) =>
    onFile(event.target.files?.[0] ?? null);
  return (
    <section aria-label="Source">
      <div role="tablist" aria-label="Source method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'UPLOAD'}
          onClick={() => onMethod('UPLOAD')}
        >
          Upload file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'FILEPATH'}
          onClick={() => onMethod('FILEPATH')}
        >
          Local filepath
        </button>
      </div>
      {method === 'FILEPATH' ? (
        <label>
          Video filepath
          <input
            aria-label="Video filepath"
            value={path}
            onChange={(e) => onPath(e.target.value)}
            placeholder="/absolute/path/video.mp4"
          />
        </label>
      ) : (
        <label>
          Video file
          <input
            aria-label="Video file"
            type="file"
            accept="video/*"
            onChange={change}
          />
          {file && <span>{file.name}</span>}
        </label>
      )}
    </section>
  );
}
