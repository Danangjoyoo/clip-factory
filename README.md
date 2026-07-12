# Clip Factory

Local-first video clipping: upload or reference a video, generate transcript/captions, create manual or AI-assisted clips, and render platform-ready outputs.

## Prerequisites

- macOS Apple Silicon is the supported development target.
- Docker Desktop with Compose.
- Node.js `24.18.0` and pnpm `11.11.0`.
- Python `3.12.11`.
- FFmpeg and FFprobe.
- The worker environment in `apps/worker/.venv`, or the pinned `uv` toolchain under `.tools/bin/uv`.

## First-time setup

```bash
cp envs/.env.example .env   # keep the existing .env if you already configured it
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install

# Preferred pinned worker setup when uv is available
pnpm worker:sync

# Existing local venv alternative
apps/worker/.venv/bin/python --version
apps/worker/.venv/bin/ruff --version
```

`OPENAI_ADAPTER=fake` is the safe default. Add `OPENAI_API_KEY` only when you are ready to use paid OpenAI calls.

## Start the local infrastructure

```bash
pnpm compose:config
pnpm compose:up
```

This starts PostgreSQL, Redis, MinIO, Temporal, Temporal UI, and the web container.

Useful URLs:

- Web: <http://127.0.0.1:3000>
- MinIO API: <http://127.0.0.1:9000> (browser upload/download URLs)
- MinIO console: <http://127.0.0.1:9001>
- Temporal UI: <http://127.0.0.1:8233>

Stop the stack with:

```bash
pnpm compose:down
```

## Run development mode

```bash
pnpm dev
```

For the worker checks with the existing virtualenv:

```bash
cd apps/worker
.venv/bin/ruff format --check src tests
.venv/bin/ruff check src tests
.venv/bin/mypy src
.venv/bin/pytest -q
```

From the repository root, the pinned `uv` equivalents are:

```bash
pnpm worker:lint
pnpm worker:typecheck
pnpm worker:test
```

## Verification

```bash
pnpm format:check
pnpm typecheck
pnpm test:contracts
pnpm test:architecture
pnpm test:unit
pnpm test:e2e -- --list
```

Full media, worker, and browser acceptance checks require FFmpeg, the worker toolchain, Playwright browser binaries, and running Compose services.

## Fake-mode integration gate

With Compose running, run the deterministic local gate against the supplied sample:

```bash
OPENAI_ADAPTER=fake pnpm test:integration-gate
```

The gate checks service health, resets and exercises the fake highlight adapter, and submits a filepath project. It never sends a request to OpenAI. `--sample /path/to/video.mp4` and `--base-url http://127.0.0.1:3000` override the defaults. Live mode is rejected before any network request:

```bash
OPENAI_ADAPTER=live pnpm test:integration-gate # expected failure
```

## Troubleshooting

- If `pnpm install` rejects very recent packages, the configured minimum-release-age policy is working as intended; retry after the packages age or use the repository-approved lockfile policy.
- If Temporal stays unhealthy, use the committed Compose file: it uses the supported `postgres12` driver and a container-safe healthcheck.
- If Playwright cannot launch, install the pinned browser once with `pnpm exec playwright install chromium`.

## Shutdown and cleanup

```bash
pnpm compose:down
```

Compose volumes are retained by default. Remove them only when you intentionally want to reset local PostgreSQL, Redis, and MinIO state.
