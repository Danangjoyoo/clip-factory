'use client';

import { useEffect, useState } from 'react';

type SettingsResponse = {
  allowedRoots: string[];
  defaultPlatform: string;
  captionProfile: string;
  catalogVersion: string;
  openAiApiKeyConfigured: boolean;
};

const missingKeyMessage =
  'OpenAI API KEY is missing, AI Assisted Mode is disabled';

export function SettingsOpenAIForm() {
  const [settings, setSettings] = useState<SettingsResponse>();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void fetch('/api/settings')
      .then((response) => response.json() as Promise<SettingsResponse>)
      .then(setSettings);
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings || !apiKey.trim()) return;
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...settings, openAiApiKey: apiKey }),
    });
    setSettings((await response.json()) as SettingsResponse);
    setApiKey('');
    setStatus('OpenAI API key saved');
  };

  return (
    <section id="openai" aria-label="OpenAI settings">
      <h2>OpenAI</h2>
      <p role={settings?.openAiApiKeyConfigured ? undefined : 'alert'}>
        {settings?.openAiApiKeyConfigured
          ? 'OpenAI API key saved'
          : status || missingKeyMessage}
      </p>
      <form onSubmit={save}>
        <label>
          OpenAI API key
          <input
            aria-label="OpenAI API key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!settings || !apiKey.trim()}>
          Save OpenAI key
        </button>
      </form>
    </section>
  );
}
