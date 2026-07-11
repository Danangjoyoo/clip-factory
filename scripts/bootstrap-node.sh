#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
VERSION="24.18.0"
BASE="https://nodejs.org/dist/v$VERSION"
ARCHIVE="node-v$VERSION-darwin-arm64.tar.gz"
mkdir -p "$TOOLS"
curl --fail --location --silent --show-error "$BASE/$ARCHIVE" -o "$TOOLS/$ARCHIVE"
curl --fail --location --silent --show-error "$BASE/SHASUMS256.txt" -o "$TOOLS/SHASUMS256.txt"
(cd "$TOOLS" && grep "  $ARCHIVE\$" SHASUMS256.txt | shasum -a 256 --check)
rm -rf "$TOOLS/node"
mkdir -p "$TOOLS/node"
tar -xzf "$TOOLS/$ARCHIVE" -C "$TOOLS/node" --strip-components=1
"$TOOLS/node/bin/node" --version | grep -Fx "v$VERSION"
PATH="$TOOLS/node/bin:$PATH" corepack enable --install-directory "$TOOLS/node/bin"
PATH="$TOOLS/node/bin:$PATH" corepack prepare pnpm@11.11.0 --activate
