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

## First-time setup

```bash
corepack enable
corepack pnpm install
cp .env.example .env
corepack pnpm prisma:generate
corepack pnpm worker:sync
```

Edit `.env` with local service values. Keep `OPENAI_API_KEY` only in the worker environment; it is optional for manual clips and required for AI highlight analysis.

## Run the application

The development launcher starts PostgreSQL, Redis, MinIO, and Temporal with Docker Compose, waits for health checks, then starts the Python worker and Next.js app:

```bash
corepack pnpm dev
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
