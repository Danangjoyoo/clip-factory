import styles from './ResultsDashboard.module.css';

export type ResultClipView = {
  id: string;
  title: string;
  durationLabel: string;
  state: string;
  originLabel: string;
  sizeLabel: string;
  formatLabel: string;
  downloadHref?: string;
  editorHref?: string;
};

export function ResultsDashboard({
  clips,
  onDownloadAll,
}: Readonly<{
  clips: readonly ResultClipView[];
  onDownloadAll?: () => void;
}>) {
  return (
    <main className={styles.dashboard} aria-label="Rendered clips">
      <nav className={styles.tabs} aria-label="Project workspace">
        <a aria-current="page" href="./clips">
          Clips
        </a>
        <span aria-disabled="true">YouTube</span>
        <a href="/usage">Usage</a>
        <a href="./settings">Project settings</a>
      </nav>
      <header className={styles.header}>
        <div>
          <h1>Clips</h1>
          <p>Rendered files remain available while other clips finish.</p>
        </div>
        {onDownloadAll && (
          <button type="button" onClick={onDownloadAll}>
            Download all (.zip)
          </button>
        )}
      </header>
      <ul className={styles.grid} aria-label="Local results">
        {clips.map((clip) => {
          const downloadable = clip.state === 'RENDERED' && clip.downloadHref;

          return (
            <li key={clip.id} className={styles.card}>
              <div
                className={styles.poster}
                role="img"
                aria-label={`Poster for ${clip.title}`}
              >
                <span className={styles.state}>{clip.state}</span>
                <span className={styles.duration}>{clip.durationLabel}</span>
              </div>
              <div className={styles.content}>
                <div>
                  <h2>{clip.title}</h2>
                </div>
                <p className={styles.meta}>
                  <span>{clip.originLabel}</span>
                  <span>{clip.sizeLabel}</span>
                </p>
                <p className={styles.info}>{clip.formatLabel}</p>
                <div className={styles.actions}>
                  {clip.editorHref ? (
                    <a href={clip.editorHref}>Open editor</a>
                  ) : (
                    <button type="button" disabled>
                      Open editor
                    </button>
                  )}
                  {downloadable ? (
                    <a
                      href={clip.downloadHref}
                      aria-label={`Download MP4: ${clip.title}`}
                    >
                      Download MP4
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-label={`Download MP4: ${clip.title}`}
                    >
                      Download MP4
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
