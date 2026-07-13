'use client';

import { useState } from 'react';

import type { YouTubeConnectionVm } from './youtube-connection.vm';
import styles from './youtube-connection-panel.module.css';

type Props = Readonly<{
  connection: YouTubeConnectionVm;
  onConnect: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
}>;

export function YouTubeConnectionPanel({
  connection,
  onConnect,
  onDisconnect,
}: Props) {
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [busyAction, setBusyAction] = useState<'connect' | 'disconnect' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const connectLabel =
    connection.status === 'REAUTH_REQUIRED'
      ? 'Reconnect YouTube'
      : 'Connect YouTube';
  const showConnect =
    connection.status === 'DISCONNECTED' ||
    connection.status === 'REAUTH_REQUIRED' ||
    connection.status === 'CONNECTING';
  const connectDisabled =
    !connection.workerAvailable ||
    busyAction !== null ||
    connection.status === 'CONNECTING';

  const runConnect = async () => {
    setError(null);
    setBusyAction('connect');
    try {
      await onConnect();
    } catch {
      setError('Connection could not be started.');
    } finally {
      setBusyAction(null);
    }
  };

  const runDisconnect = async () => {
    setError(null);
    setBusyAction('disconnect');
    try {
      await onDisconnect();
      setConfirmingDisconnect(false);
    } catch {
      setError('Disconnect could not be started.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="youtube-connection-heading">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Channel access</p>
          <h2 id="youtube-connection-heading">YouTube connection</h2>
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          {connection.statusLabel}
        </p>
      </div>

      {connection.channelTitle ? (
        <div className={styles.channel}>
          <span className={styles.avatar} aria-hidden="true">
            {connection.channelTitle.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className={styles.channelTitle}>{connection.channelTitle}</p>
            {connection.channelHandle ? (
              <p className={styles.channelHandle}>{connection.channelHandle}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className={styles.empty}>No channel is connected.</p>
      )}

      {!connection.workerAvailable ? (
        <p className={styles.warning}>
          Start the native worker to connect or upload.
        </p>
      ) : null}
      {connection.testingExpiryWarning ? (
        <p className={styles.warning}>{connection.testingExpiryWarning}</p>
      ) : null}
      {connection.revocationUncertain ? (
        <p className={styles.warning}>
          Previous remote revocation could not be confirmed.
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        {showConnect ? (
          <button
            type="button"
            disabled={connectDisabled}
            onClick={() => void runConnect()}
          >
            {busyAction === 'connect' ? 'Starting...' : connectLabel}
          </button>
        ) : null}
        {connection.status === 'CONNECTED' ? (
          <button
            className={styles.secondary}
            type="button"
            disabled={busyAction !== null}
            onClick={() => setConfirmingDisconnect(true)}
          >
            Disconnect YouTube
          </button>
        ) : null}
      </div>

      {confirmingDisconnect ? (
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="disconnect-youtube-title"
        >
          <h3 id="disconnect-youtube-title">Disconnect YouTube?</h3>
          <p>
            Clip Factory keeps local drafts, renders, and publication history.
          </p>
          <div className={styles.dialogActions}>
            <button
              className={styles.secondary}
              type="button"
              disabled={busyAction !== null}
              onClick={() => setConfirmingDisconnect(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void runDisconnect()}
            >
              Revoke access and disconnect
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
