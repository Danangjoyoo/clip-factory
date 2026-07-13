'use client';

import { useEffect, useState } from 'react';

import type { YouTubeConnectionVm } from './youtube-connection.vm';
import { youtubeConnectionApiToVm } from './youtube-connection.vm';
import { YouTubeConnectionPanel } from './youtube-connection-panel';
import styles from './PublishingView.module.css';

export type PublishingClipVm = {
  id: string;
  title: string;
  durationLabel: string;
  stateLabel: string;
  metadataStatusLabel: string;
  scheduleLabel: string;
};

type Props = Readonly<{
  projectId: string;
  connection: YouTubeConnectionVm;
  clips: readonly PublishingClipVm[];
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
}>;

export function PublishingGallery({
  projectId,
  connection,
  clips,
  onConnect,
  onDisconnect,
}: Props) {
  const [selectedClip, setSelectedClip] = useState<PublishingClipVm | null>(
    null,
  );
  return (
    <main className={styles.workspace} aria-label="YouTube publishing">
      <nav className={styles.tabs} aria-label="Project workspace">
        <a href={`/projects/${projectId}/clips`}>Clips</a>
        <a aria-current="page" href={`/projects/${projectId}/youtube`}>
          YouTube
        </a>
        <a href="/usage">Usage</a>
        <a href={`/projects/${projectId}/settings`}>Project settings</a>
      </nav>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Publishing workspace</p>
          <h1>YouTube</h1>
          <p>Prepare metadata, schedule private uploads, and track each clip.</p>
        </div>
      </header>
      <div className={styles.layout}>
        <YouTubeConnectionPanel
          connection={connection}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
        <section className={styles.gallery} aria-labelledby="youtube-clips-title">
          <div className={styles.sectionHeader}>
            <h2 id="youtube-clips-title">Rendered clips</h2>
            <span>{clips.length} ready</span>
          </div>
          {clips.length === 0 ? (
            <p className={styles.empty}>No rendered clips are ready to publish.</p>
          ) : (
            <ul className={styles.grid} aria-label="YouTube publishing clips">
              {clips.map((clip) => (
                <li key={clip.id} className={styles.card}>
                  <div className={styles.poster} aria-hidden="true">
                    <span>{clip.durationLabel}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3>{clip.title}</h3>
                    <p>{clip.stateLabel}</p>
                    <dl>
                      <div>
                        <dt>Metadata</dt>
                        <dd>{clip.metadataStatusLabel}</dd>
                      </div>
                      <div>
                        <dt>Schedule</dt>
                        <dd>{clip.scheduleLabel}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => setSelectedClip(clip)}
                      aria-label={`Details: ${clip.title}`}
                    >
                      Details
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {selectedClip ? (
        <PublicationDetailsDrawer
          clip={selectedClip}
          onClose={() => setSelectedClip(null)}
        />
      ) : null}
    </main>
  );
}

export function YouTubePublishingLocalPage({
  projectId,
}: Readonly<{ projectId: string }>) {
  const [connection, setConnection] = useState<YouTubeConnectionVm>(
    youtubeConnectionApiToVm(disconnectedConnectionApi),
  );

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/v1/youtube/connections')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) {
          setConnection(youtubeConnectionApiToVm(payload));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublishingGallery
      projectId={projectId}
      connection={connection}
      clips={[]}
      onConnect={async () => {
        const response = await fetch('/api/v1/youtube/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!response.ok) throw new Error('connect failed');
        setConnection((current) => ({
          ...current,
          status: 'CONNECTING',
          statusLabel: 'Connecting to YouTube',
        }));
      }}
      onDisconnect={async () => {
        const response = await fetch('/api/v1/youtube/connections/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!response.ok) throw new Error('disconnect failed');
        setConnection(youtubeConnectionApiToVm(disconnectedConnectionApi));
      }}
    />
  );
}

function PublicationDetailsDrawer({
  clip,
  onClose,
}: Readonly<{ clip: PublishingClipVm; onClose: () => void }>) {
  return (
    <aside
      className={styles.drawer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="publication-details-title"
    >
      <div className={styles.drawerHeader}>
        <div>
          <p className={styles.eyebrow}>Clip details</p>
          <h2 id="publication-details-title">{clip.title} details</h2>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.detailTabs} role="tablist" aria-label="Clip details">
        {['Publishing', 'Metadata', 'Thumbnail', 'Schedule'].map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={index === 0}
          >
            {tab}
          </button>
        ))}
      </div>
      <dl className={styles.details}>
        <div>
          <dt>Publishing state</dt>
          <dd>{clip.stateLabel}</dd>
        </div>
        <div>
          <dt>Metadata</dt>
          <dd>{clip.metadataStatusLabel}</dd>
        </div>
        <div>
          <dt>Schedule</dt>
          <dd>{clip.scheduleLabel}</dd>
        </div>
      </dl>
    </aside>
  );
}

const disconnectedConnectionApi = {
  id: null,
  channel: null,
  grantedScopes: [],
  status: 'DISCONNECTED',
  oauthMode: 'UNKNOWN',
  refreshTokenExpiresAt: null,
  testingExpiryWarning: null,
  revocationUncertain: false,
  workerAvailable: true,
} as const;
