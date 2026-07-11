#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
ARCHIVE="$TOOLS/uv-aarch64-apple-darwin.tar.gz"
mkdir -p "$TOOLS/bin" "$TOOLS/extract"
curl --fail --location --silent --show-error "https://github.com/astral-sh/uv/releases/download/0.11.28/uv-aarch64-apple-darwin.tar.gz" -o "$ARCHIVE"
echo "33540eb7c883ab857eff79bd5ac2aa31fe27b595abecb4a9c003a2c998447232  $ARCHIVE" | shasum -a 256 --check
tar -xzf "$ARCHIVE" -C "$TOOLS/extract"
install -m 0755 "$TOOLS/extract/uv-aarch64-apple-darwin/uv" "$TOOLS/bin/uv"
install -m 0755 "$TOOLS/extract/uv-aarch64-apple-darwin/uvx" "$TOOLS/bin/uvx"
"$TOOLS/bin/uv" python install 3.12.11
