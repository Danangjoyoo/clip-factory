'use client';

import type { ReactNode } from 'react';
import { themeIds, type ThemeId } from './theme';
import { useTheme } from './ThemeProvider';
import styles from './AppShell.module.css';

type AppShellProps = {
  children: ReactNode;
  workerStatus?: 'ready' | 'offline';
};

const themeLabels: Record<ThemeId, string> = {
  tactile: 'Tactile Cutting Room',
  midnight: 'Midnight Signal',
  signal: 'Creator Signal',
};

export function AppShell({ children, workerStatus = 'ready' }: AppShellProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="/">
          Clip Factory
        </a>
        <nav aria-label="Studio" className={styles.navigation}>
          <a href="/">Projects</a>
          <a href="/usage">Usage</a>
          <a href="/settings">Settings</a>
        </nav>
        <div className={styles.controls}>
          <span className={styles.workerStatus}>Worker {workerStatus}</span>
          <label className={styles.theme}>
            <span>Theme</span>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemeId)}
            >
              {themeIds.map((themeId) => (
                <option key={themeId} value={themeId}>
                  {themeLabels[themeId]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
