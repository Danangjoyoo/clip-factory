#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
VERSION="0.11.28"
PLATFORM="${1:-}"
DRY_RUN=false
if [[ "$PLATFORM" == "--platform" ]]; then PLATFORM="${2:?--platform requires darwin-arm64 or linux-x86_64}"; shift 2; fi
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=true; fi
if [[ -z "$PLATFORM" && "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then PLATFORM=darwin-arm64; fi
if [[ -z "$PLATFORM" && "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]]; then PLATFORM=linux-x86_64; fi
case "$PLATFORM" in
  darwin-arm64) TARGET="aarch64-apple-darwin"; SHA256="33540eb7c883ab857eff79bd5ac2aa31fe27b595abecb4a9c003a2c998447232" ;;
  linux-x86_64) TARGET="x86_64-unknown-linux-gnu"; SHA256="e490a6464492183c5d4534a5527fb4440f7f2bb2f228162ad7e4afe076dc0224" ;;
  *) echo "unsupported platform: $PLATFORM" >&2; exit 64 ;;
esac
ARCHIVE="$TOOLS/uv-$TARGET.tar.gz"
URL="https://github.com/astral-sh/uv/releases/download/$VERSION/uv-$TARGET.tar.gz"
if $DRY_RUN; then
  printf 'curl %s -o %s\n' "$URL" "$ARCHIVE"
  printf 'install %s/uv-%s/uv %s/bin/uv\n' "$TOOLS/extract" "$TARGET" "$TOOLS"
  exit 0
fi
mkdir -p "$TOOLS/bin" "$TOOLS/extract"
curl --fail --location --silent --show-error "$URL" -o "$ARCHIVE"
echo "$SHA256  $ARCHIVE" | shasum -a 256 --check
tar -xzf "$ARCHIVE" -C "$TOOLS/extract"
install -m 0755 "$TOOLS/extract/uv-$TARGET/uv" "$TOOLS/bin/uv"
install -m 0755 "$TOOLS/extract/uv-$TARGET/uvx" "$TOOLS/bin/uvx"
"$TOOLS/bin/uv" python install 3.12.11
