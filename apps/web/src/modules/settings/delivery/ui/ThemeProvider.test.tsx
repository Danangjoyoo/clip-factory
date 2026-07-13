import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeProbe() {
  const { theme } = useTheme();

  return <output>{theme}</output>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeProvider', () => {
  it('uses Midnight Signal when no saved theme exists', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('midnight')).toBeInTheDocument();
  });

  it('persists a selected theme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <AppShell>Workspace</AppShell>
      </ThemeProvider>,
    );
    await user.selectOptions(screen.getByLabelText('Theme'), 'signal');

    expect(localStorage.getItem('clip-factory.theme')).toBe('signal');
    expect(document.documentElement.dataset.theme).toBe('signal');
  });

  it('renders labelled studio navigation and worker status', () => {
    render(
      <ThemeProvider>
        <AppShell workerStatus="offline">Workspace</AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Studio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Usage' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeVisible();
    expect(screen.getByText('Worker offline')).toBeVisible();
  });
});
