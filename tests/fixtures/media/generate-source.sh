#!/usr/bin/env sh
set -eu
test "${1-}" || { echo "usage: $0 OUTPUT" >&2; exit 2; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=black:s=320x240:d=1 -f lavfi -i sine=frequency=440:d=1 -shortest -y "$1"
