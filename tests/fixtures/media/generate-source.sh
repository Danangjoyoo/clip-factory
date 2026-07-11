#!/usr/bin/env bash
set -euo pipefail
OUT="${1:?usage: $0 OUTPUT}"
command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"
ffmpeg -nostdin -hide_banner -loglevel error \
  -f lavfi -i "testsrc2=size=1920x1080:rate=30:duration=10" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=10" \
  -vf "drawbox=x='200+100*t':y=250:w=300:h=500:color=white@0.8:t=fill" \
  -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest -movflags +faststart -y "$OUT"
