from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from typing import Any
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[4]
GENERATOR = ROOT / "tests/fixtures/media/generate-source.sh"
CAPTIONS = Path(__file__).parent / "golden/captions.ass"


def run(command: list[str | Path]) -> None:
    subprocess.run([str(item) for item in command], check=True, capture_output=True)


def probe(path: Path) -> dict[str, Any]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="ffmpeg required")
def test_synthetic_source_renders_vertical_captioned_clip(tmp_path: Path) -> None:
    source = tmp_path / "talking-head.mp4"
    output = tmp_path / "final.mp4"
    plain = tmp_path / "plain.png"
    captioned = tmp_path / "captioned.png"
    run([GENERATOR, source])
    ass_filter = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,ass=filename='{CAPTIONS}'"
    run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", source,
         "-t", "5", "-vf", ass_filter,
         "-c:v", "libx264", "-c:a", "aac", "-y", output])
    details = probe(output)
    video = next(item for item in details["streams"] if item["codec_type"] == "video")
    audio = next(item for item in details["streams"] if item["codec_type"] == "audio")
    assert details["format"]["format_name"].split(",")[0] == "mp4"
    assert (video["width"], video["height"], video["codec_name"]) == (1080, 1920, "h264")
    assert audio["codec_name"] == "aac"
    assert 4900 <= round(float(details["format"]["duration"]) * 1000) <= 5100
    run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", source,
         "-frames:v", "1", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-y", plain])
    run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", output,
         "-frames:v", "1", "-y", captioned])
    assert hashlib.sha256(plain.read_bytes()).digest() != hashlib.sha256(captioned.read_bytes()).digest()
