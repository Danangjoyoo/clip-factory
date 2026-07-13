import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

const settings = {
  allowedRoots: [],
  defaultPlatform: 'youtube',
  captionProfile: 'default',
  catalogVersion: 'local',
  openAiApiKeyConfigured: false,
};

describe('SettingsPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the approved settings menu shell and OpenAI notice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(settings)));

    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Settings menu' }),
    ).toHaveTextContent('OpenAI');
    expect(
      await screen.findByText(
        'OpenAI API KEY is missing, AI Assisted Mode is disabled',
      ),
    ).toBeVisible();
  });
});
