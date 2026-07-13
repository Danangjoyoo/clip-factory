import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsOpenAIForm } from './SettingsOpenAIForm';

const settings = {
  allowedRoots: [],
  defaultPlatform: 'youtube',
  captionProfile: 'default',
  catalogVersion: 'local',
};

describe('SettingsOpenAIForm', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saves an OpenAI API key and reports configured state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ ...settings, openAiApiKeyConfigured: false }),
      )
      .mockResolvedValueOnce(
        Response.json({ ...settings, openAiApiKeyConfigured: true }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<SettingsOpenAIForm />);

    expect(
      await screen.findByText(
        'OpenAI API KEY is missing, AI Assisted Mode is disabled',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('OpenAI API key'), {
      target: { value: 'sk-test-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save OpenAI key' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sk-test-key'),
        }),
      ),
    );
    expect(await screen.findByText('OpenAI API key saved')).toBeInTheDocument();
  });
});
