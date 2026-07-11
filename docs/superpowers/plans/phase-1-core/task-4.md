# Task 4: Compose Infrastructure and Native Lifecycle

> **For agentic workers:** Use superpowers:test-driven-development. Configuration and lifecycle behavior receive executable tests before Compose or scripts are written.

## Purpose and traceability

Deliver design §§5, 8, 24–26: localhost web plus PostgreSQL, Redis, MinIO, and Temporal with persistent volumes, while the media worker remains a native macOS process managed through one root lifecycle.

## Layers and boundaries

- `infra/compose` is deployment adapter configuration, not application policy.
- `scripts/dev.mjs` is a composition/lifecycle entry point. It starts Compose, waits for health, launches native Python, forwards signals, and stops the worker before Compose.
- No production container receives `OPENAI_API_KEY`; only the native worker process does.

## Exact files

- Create: `Brewfile`, `infra/compose/docker-compose.yml`, `infra/compose/docker-compose.ci.yml`, `infra/compose/image-lock.json`, `infra/compose/web.Dockerfile`, `infra/compose/temporal-dynamicconfig.yaml`
- Create: `scripts/bootstrap-native.sh`, `scripts/preflight.mjs`, `scripts/dev.mjs`, `scripts/stop.mjs`, `tests/architecture/compose.test.mjs`, `tests/architecture/preflight.test.mjs`
- Modify: `.env.example`, `package.json`

## Prerequisites and interfaces

- Requires Tasks 1 and 3.
- Named services: `web`, `postgres`, `redis`, `minio`, `minio-init`, `temporal`, `temporal-ui`.
- Named volumes: exactly `postgres-data`, `redis-data`, and `minio-data`; Temporal persists in the shared PostgreSQL volume and therefore has no fourth data volume.
- Native command: `uv run --directory apps/worker clip-factory-worker`.

## RED → GREEN → REFACTOR

- [ ] **RED: test service set, localhost binding, persistence, and secret exclusion.**

```js
// tests/architecture/compose.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('compose is localhost-only and never receives the OpenAI key', () => {
  const result = spawnSync('docker', ['compose', '--env-file', '.env.example', '-f', 'infra/compose/docker-compose.yml', 'config', '--format', 'json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(config.services).sort(), ['minio', 'minio-init', 'postgres', 'redis', 'temporal', 'temporal-ui', 'web']);
  assert.equal(config.services.web.ports[0].host_ip, '127.0.0.1');
  assert.equal(JSON.stringify(config).includes('OPENAI_API_KEY'), false);
  assert.deepEqual(Object.keys(config.volumes).sort(), ['minio-data', 'postgres-data', 'redis-data']);
});
```

- [ ] Before RED, create parseable `docker-compose.yml`, `docker-compose.ci.yml`, and `image-lock.json` shells with empty service/volume/image objects; run `docker compose --env-file .env.example -f infra/compose/docker-compose.yml config --quiet`; expect PASS. Then run `node --test tests/architecture/compose.test.mjs`; expect the named service-set assertion to FAIL with `[]` rather than seven services.

- [ ] **GREEN: create the exact service graph with the verified multi-architecture digests below.** Record the same six name/tag/digest triples—`postgres`, `redis`, `minio`, `minio-init`, `temporal`, and `temporal-ui`—in `infra/compose/image-lock.json`; the file list in this task explicitly includes that lock file, and `tests/architecture/compose.test.mjs` asserts Compose and lock values match byte-for-byte. Run `node --test tests/architecture/compose.test.mjs && pnpm compose:config`; expect PASS.

```yaml
# infra/compose/docker-compose.yml
name: clip-factory

services:
  web:
    build:
      context: ../..
      dockerfile: infra/compose/web.Dockerfile
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      TEMPORAL_ADDRESS: temporal:7233
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      minio: { condition: service_healthy }
      temporal: { condition: service_healthy }
  postgres:
    image: postgres:17.5-bookworm@sha256:fbcea1bd13b6a882cd6caa6b58db3ae5c102efe50ec625b3e2a5cbc50db5bfe4
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U clip_factory -d clip_factory"], interval: 2s, timeout: 2s, retries: 30 }
  redis:
    image: redis:8.0.5-bookworm@sha256:dbd4be0dd40f16bd91486087680fc2d25666e807b937774906dc111a621ce556
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 2s, timeout: 2s, retries: 30 }
  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e
    command: server /data --console-address :9001
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    volumes:
      - minio-data:/data
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"], interval: 2s, timeout: 2s, retries: 30 }
  minio-init:
    image: minio/mc:RELEASE.2025-04-16T18-13-26Z@sha256:aead63c77f9db9107f1696fb08ecb0faeda23729cde94b0f663edf4fe09728e3
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: ["/bin/sh", "-ec"]
    command:
      - >-
        mc alias set local http://minio:9000 "$${MINIO_ACCESS_KEY}" "$${MINIO_SECRET_KEY}" &&
        mc mb --ignore-existing local/clip-factory &&
        mc anonymous set none local/clip-factory
    environment:
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
  temporal:
    image: temporalio/auto-setup:1.29.7@sha256:f14912b699cf73015ad5c4fc18d522d4b014db90e794039214dfb7c022c2644f
    environment:
      DB: postgresql
      DB_PORT: 5432
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PWD: ${POSTGRES_PASSWORD}
      POSTGRES_SEEDS: postgres
      DYNAMIC_CONFIG_FILE_PATH: config/dynamicconfig/development-sql.yaml
    volumes:
      - ./temporal-dynamicconfig.yaml:/etc/temporal/config/dynamicconfig/development-sql.yaml:ro
    ports:
      - "127.0.0.1:7233:7233"
    depends_on: { postgres: { condition: service_healthy } }
    healthcheck: { test: ["CMD", "tctl", "cluster", "health"], interval: 3s, timeout: 3s, retries: 40 }
  temporal-ui:
    image: temporalio/ui:2.42.1@sha256:64e8d7d3cb24072373034186cd2be41338b75c02cdaba8fec68de9d76ed3b60a
    environment:
      TEMPORAL_ADDRESS: temporal:7233
    ports:
      - "127.0.0.1:8233:8080"
    depends_on: { temporal: { condition: service_healthy } }

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

Use this complete dynamic configuration:

```yaml
# infra/compose/temporal-dynamicconfig.yaml
system.forceSearchAttributesCacheRefreshOnRead:
  - value: true
    constraints: {}
```

- [ ] Run `node --test tests/architecture/compose.test.mjs` and `pnpm compose:config`; expect PASS.

- [ ] **RED: test native preflight diagnostics before lifecycle code.**

```js
// tests/architecture/preflight.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('preflight reports every absent native dependency in check mode', () => {
  const result = spawnSync(process.execPath, ['scripts/preflight.mjs', '--path', '/usr/bin:/bin'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /uv 0\.11\.28/);
  assert.match(result.stderr, /ffmpeg 8\.1\.2/);
  assert.match(result.stderr, /ffprobe 8\.1\.2/);
});
```

- [ ] Create a compile-safe `scripts/preflight.mjs` shell that exits zero and prints no diagnostics; run `node --check scripts/preflight.mjs`; expect PASS. Then run `node --test tests/architecture/preflight.test.mjs`; expect the named exit-status assertion to FAIL with `0` instead of `1`.

- [ ] **GREEN: use Homebrew only for build libraries and install the two runtime tools from pinned archives.**

```ruby
# Brewfile
brew "pkgconf"
brew "nasm"
brew "libass"
brew "x264"
```

```bash
# scripts/bootstrap-native.sh (macOS arm64 and Ubuntu x86_64)
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
DOWNLOADS="$TOOLS/downloads"
FFMPEG_VERSION="8.1.2"
FFMPEG_SHA256="464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c"
PLATFORM="${1:-}"
if [[ "$PLATFORM" == "--platform" ]]; then PLATFORM="${2:?--platform requires darwin-arm64 or linux-x86_64}"; shift 2
elif [[ -z "$PLATFORM" && "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then PLATFORM="darwin-arm64"
elif [[ -z "$PLATFORM" && "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]]; then PLATFORM="linux-x86_64"
fi
mkdir -p "$DOWNLOADS" "$TOOLS/bin"
"$ROOT/scripts/bootstrap-uv.sh"

case "$PLATFORM" in
  darwin-arm64)
    command -v brew >/dev/null
    PKG_CONFIG_PATH="$(brew --prefix libass)/lib/pkgconfig:$(brew --prefix x264)/lib/pkgconfig"
    FFMPEG_PLATFORM_FLAGS=(--enable-videotoolbox)
    BUILD_JOBS="$(sysctl -n hw.logicalcpu)"
    ;;
  linux-x86_64)
    sudo apt-get update
    sudo apt-get install --yes --no-install-recommends build-essential pkg-config nasm libass-dev libx264-dev ca-certificates curl xz-utils
    PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig"
    FFMPEG_PLATFORM_FLAGS=()
    BUILD_JOBS="$(getconf _NPROCESSORS_ONLN)"
    ;;
  *) echo "unsupported platform: $PLATFORM" >&2; exit 64 ;;
esac

curl --fail --location --silent --show-error "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz" -o "$DOWNLOADS/ffmpeg.tar.xz"
echo "$FFMPEG_SHA256  $DOWNLOADS/ffmpeg.tar.xz" | shasum -a 256 --check
rm -rf "$DOWNLOADS/ffmpeg-$FFMPEG_VERSION"
tar -xJf "$DOWNLOADS/ffmpeg.tar.xz" -C "$DOWNLOADS"
pushd "$DOWNLOADS/ffmpeg-$FFMPEG_VERSION"
PKG_CONFIG_PATH="$PKG_CONFIG_PATH" ./configure \
  --prefix="$TOOLS/ffmpeg/$FFMPEG_VERSION" \
  --enable-gpl \
  --enable-libass \
  --enable-libx264 \
  "${FFMPEG_PLATFORM_FLAGS[@]}" \
  --disable-debug \
  --disable-doc
make -j "$BUILD_JOBS"
make install
popd
ln -sfn "$TOOLS/ffmpeg/$FFMPEG_VERSION/bin/ffmpeg" "$TOOLS/bin/ffmpeg"
ln -sfn "$TOOLS/ffmpeg/$FFMPEG_VERSION/bin/ffprobe" "$TOOLS/bin/ffprobe"
PATH="$TOOLS/bin:$PATH" uv python install 3.12.11
```

Add `.tools/` to `.gitignore`. Implement `preflight.mjs` using `spawnSync(command, ['--version'])`, never a shell string. Prepend `<repo>/.tools/bin` to the inspected path and verify Docker 29.4.0, Compose 5.1.2, uv 0.11.28, Python 3.12.11 through `uv run`, and FFmpeg/ffprobe 8.1.2. On macOS its recovery message is `Run: brew bundle && ./scripts/bootstrap-native.sh --platform darwin-arm64`; on Linux it is `Run: ./scripts/bootstrap-native.sh --platform linux-x86_64`. Linux must not execute Homebrew, `sysctl`, or enable VideoToolbox.

- [ ] Run `node --test tests/architecture/preflight.test.mjs`; expect PASS. On macOS run `brew bundle && ./scripts/bootstrap-native.sh --platform darwin-arm64 && node scripts/preflight.mjs`; on Ubuntu run `./scripts/bootstrap-native.sh --platform linux-x86_64 && node scripts/preflight.mjs`; expect exit 0 in each supported platform test.

- [ ] **RED: add `tests/architecture/lifecycle.test.mjs`.** Inject a fake spawner, invoke shutdown, and assert event order `worker:SIGTERM`, `worker:exit`, `compose:down`; a stubborn worker adds `worker:SIGKILL` exactly after fake clock advances 15000 ms.

- [ ] **GREEN: create the lifecycle core below and call it from `dev.mjs`; `stop.mjs` runs only the final Compose command.**

```js
// scripts/dev.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const compose = ['compose','--env-file','.env','-f','infra/compose/docker-compose.yml'];
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio:'inherit', shell:false });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});

await run('node', ['scripts/preflight.mjs']);
await run('docker', compose.concat(['up','-d','--wait']));
const worker = spawn('.tools/bin/uv', ['run','--directory','apps/worker','clip-factory-worker'], { stdio:'inherit', shell:false, env:process.env });
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  const alreadyExited = worker.exitCode !== null || worker.signalCode !== null;
  if (!alreadyExited) worker.kill(signal);
  const exited = alreadyExited ? Promise.resolve() : new Promise((resolve) => worker.once('exit', resolve));
  const timedOut = await Promise.race([exited.then(() => false), delay(15000).then(() => true)]);
  if (timedOut) { worker.kill('SIGKILL'); await exited; }
  await run('docker', compose.concat(['down']));
}
process.once('SIGINT', () => void shutdown('SIGTERM'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
worker.once('exit', (code) => { if (!stopping) void shutdown('SIGTERM').then(() => { process.exitCode = code ?? 1; }); });
```

```js
// scripts/stop.mjs
import { spawnSync } from 'node:child_process';
const result = spawnSync('docker', ['compose','--env-file','.env','-f','infra/compose/docker-compose.yml','down'], { stdio:'inherit', shell:false });
process.exitCode = result.status ?? 1;
```

- [ ] Run `node --test tests/architecture/lifecycle.test.mjs`; expect PASS, then keep all Task 4 checks green.

## Broader verification

```bash
pnpm compose:config
pnpm compose:up
docker compose --env-file .env -f infra/compose/docker-compose.yml ps
node scripts/preflight.mjs
pnpm compose:down
pnpm test:architecture
git diff --check
```

Expected: services become healthy, public bindings resolve to `127.0.0.1`, named volumes persist, and the native preflight passes without exposing a secret to Compose.

**Suggested commit:** `feat: add local compose and native worker lifecycle`
