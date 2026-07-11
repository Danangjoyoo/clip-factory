# Clip Factory

Local-first video clip generation: upload or reference a local video, transcribe it, find highlights, render vertical clips with captions, and download the results.

## Prerequisites

- macOS (Apple Silicon is the target worker platform)
- Node.js 24.x and Corepack
- Docker Desktop with Compose
- Python 3.12 and `uv`
- Homebrew (for FFmpeg/media libraries)

Install native media dependencies:

```bash
brew bundle
```

## Fresh start

From a new checkout, run:

```bash
brew bundle
corepack enable
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm install
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm prisma:generate:local
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm worker:sync:local
```

The local profile uses the fake OpenAI adapter, so it needs no API key. For real OpenAI analysis, edit `env/.dev.env` and set `OPENAI_ADAPTER=live` plus `OPENAI_API_KEY`; never commit that file.

Before starting, ensure ports `3000`, `5432`, `6379`, `7233`, `8233`, `9000`, and `9001` are free. If another Compose project owns them, stop that project first. To reset only Clip Factory services:

```bash
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm compose:down
```

Environment shortcuts are available:

```bash
corepack pnpm prisma:generate:dev
corepack pnpm worker:sync:dev
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm dev:dev

# or use the fake/OpenAI-free local profile
corepack pnpm prisma:generate:local
corepack pnpm worker:sync:local
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm dev:local
```

Each shortcut loads `env/.dev.env` or `env/.local.env` into the child process before running. The launcher starts PostgreSQL, Redis, MinIO, Temporal, the worker, and the web app.

## Run the application

The development launcher starts PostgreSQL, Redis, MinIO, and Temporal with Docker Compose, waits for health checks, then starts the Python worker and Next.js app:

```bash
PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 corepack pnpm dev:local
```

Open <http://localhost:3000>.

To start services and the worker separately:

```bash
corepack pnpm compose:up
corepack pnpm worker:sync
corepack pnpm --filter @clip-factory/web dev
corepack pnpm worker:test # optional verification; worker command is started by `pnpm dev`
```

Stop local services with:

```bash
corepack pnpm compose:down
```

## Database

Apply migrations to the configured PostgreSQL database:

```bash
corepack pnpm db:migrate:deploy
```

The web application owns PostgreSQL writes. Redis stores rebuildable live job projections, MinIO stores media artifacts, and Temporal stores workflow execution history.

## Verification

Run the fast local gates:

```bash
corepack pnpm --config.minimum-release-age=0 typecheck
corepack pnpm --config.minimum-release-age=0 lint
corepack pnpm --config.minimum-release-age=0 test:unit
.tools/bin/uv run --directory apps/worker pytest -q
```

The full verification commands are listed in `package.json` (`verify`, integration, media, and Playwright suites). Docker-backed suites require healthy Compose services.

## Troubleshooting

- If `pnpm` is unavailable, run `corepack enable` and use `corepack pnpm`.
- If dependency installation is blocked by the release-age policy during local development, use `--config.minimum-release-age=0`.
- If the worker cannot start, verify `uv`, FFmpeg, the `.env` values, and that Docker Compose health checks pass.
- Manual clip mode does not call OpenAI and can run without an API key.
