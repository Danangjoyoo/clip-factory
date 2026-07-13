# OpenAI Key Settings Design

## Goal

Let a local user configure an OpenAI API key from Settings, warn when no key is configured, and keep AI-assisted project modes disabled until a key exists.

## Design

- Reuse the existing `/api/settings` route and `LocalSettingsStoreAdapter`.
- Store `openAiApiKey` in the local settings JSON with the adapter's existing `0600` write mode.
- Never return the raw key from GET; return only `openAiApiKeyConfigured`.
- The Settings page shows an OpenAI API key form and saves through `/api/settings`.
- `NewProjectForm` receives `openAiApiKeyConfigured`; when false, non-manual AI modes are disabled and the user sees: `OpenAI API KEY is missing, AI Assisted Mode is disabled`.
- The worker keeps using `OPENAI_API_KEY` first, then reads `.data/settings.json` as local fallback.
- Coverage threshold is 80%.

## Tests

- Settings controller saves a key and redacts it from GET.
- Worker settings reads a local settings key when env key is missing.
- New project form shows the missing-key notice and disables AI-assisted modes.
