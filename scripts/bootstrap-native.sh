#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
DOWNLOADS="$TOOLS/downloads"
FFMPEG_VERSION="8.1.2"
FFMPEG_SHA256="464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c"
PLATFORM="${1:-}"
DRY_RUN=false
if [[ "$PLATFORM" == "--platform" ]]; then PLATFORM="${2:?--platform requires darwin-arm64 or linux-x86_64}"
elif [[ -z "$PLATFORM" && "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]]; then PLATFORM=darwin-arm64
elif [[ -z "$PLATFORM" && "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]]; then PLATFORM=linux-x86_64
fi
if [[ "${3:-}" == "--dry-run" || "${1:-}" == "--dry-run" ]]; then DRY_RUN=true; fi
mkdir -p "$DOWNLOADS" "$TOOLS/bin"
if $DRY_RUN; then "$ROOT/scripts/bootstrap-uv.sh" --platform "$PLATFORM" --dry-run; exit 0; fi
"$ROOT/scripts/bootstrap-uv.sh" --platform "$PLATFORM"
case "$PLATFORM" in
  darwin-arm64) command -v brew >/dev/null; PKG_CONFIG_PATH="$(brew --prefix libass)/lib/pkgconfig:$(brew --prefix x264)/lib/pkgconfig"; FFMPEG_PLATFORM_FLAGS=(--enable-videotoolbox); BUILD_JOBS="$(sysctl -n hw.logicalcpu)" ;;
  linux-x86_64) sudo apt-get update; sudo apt-get install --yes --no-install-recommends build-essential pkg-config nasm libass-dev libx264-dev ca-certificates curl xz-utils; PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig; FFMPEG_PLATFORM_FLAGS=(); BUILD_JOBS="$(getconf _NPROCESSORS_ONLN)" ;;
  *) echo "unsupported platform: $PLATFORM" >&2; exit 64;;
esac
curl --fail --location --silent --show-error "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz" -o "$DOWNLOADS/ffmpeg.tar.xz"
echo "$FFMPEG_SHA256  $DOWNLOADS/ffmpeg.tar.xz" | shasum -a 256 --check
rm -rf "$DOWNLOADS/ffmpeg-$FFMPEG_VERSION"; tar -xJf "$DOWNLOADS/ffmpeg.tar.xz" -C "$DOWNLOADS"
pushd "$DOWNLOADS/ffmpeg-$FFMPEG_VERSION" >/dev/null
PKG_CONFIG_PATH="$PKG_CONFIG_PATH" ./configure --prefix="$TOOLS/ffmpeg/$FFMPEG_VERSION" --enable-gpl --enable-libass --enable-libx264 "${FFMPEG_PLATFORM_FLAGS[@]}" --disable-debug --disable-doc
make -j "$BUILD_JOBS"; make install; popd >/dev/null
ln -sfn "$TOOLS/ffmpeg/$FFMPEG_VERSION/bin/ffmpeg" "$TOOLS/bin/ffmpeg"
ln -sfn "$TOOLS/ffmpeg/$FFMPEG_VERSION/bin/ffprobe" "$TOOLS/bin/ffprobe"
PATH="$TOOLS/bin:$PATH" uv python install 3.12.11
