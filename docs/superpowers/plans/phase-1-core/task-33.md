# Task 33: Synthetic FFmpeg Media Integration Suite

> **For agentic workers:** Use superpowers:test-driven-development. Fixtures are generated from commands; never commit user or copyrighted media.

## Purpose and traceability

Implement design §27 media coverage: probe, trim, audio normalization, caption burn-in, crop, preview, full render, software encoder assertions, and VideoToolbox capability smoke on macOS.

## Boundaries and files

- Requires Tasks 11, 18–23.
- Create `tests/fixtures/media/generate-source.sh`, `tests/media/test_media_pipeline.py`, `tests/media/assert_probe.py`, golden ASS text, and `.gitignore` fixture output rules.
- CI runs software encoder; native acceptance separately runs VideoToolbox.

## RED → GREEN → REFACTOR

- [ ] **RED: integration test expects generated source and final invariants.**

```python
def test_synthetic_source_renders_vertical_captioned_clip(media_workspace: Path) -> None:
    source = media_workspace / "talking-head.mp4"
    result = run_pipeline(source, clip_start_ms=1000, clip_end_ms=6000, encoder="SOFTWARE")
    assert result.probe.container == "mp4"
    assert (result.probe.width, result.probe.height) == (1080, 1920)
    assert result.probe.video_codec == "h264"
    assert result.probe.audio_codec == "aac"
    assert 4900 <= result.probe.duration_ms <= 5100
    assert result.audio_rms_db > -40
    assert result.caption_difference_pixels > 1000
```

- [ ] Run `pnpm test:media`; expect FAIL because fixture generator/pipeline harness is absent.

- [ ] **GREEN: create deterministic 10-second source generator.**

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT="${1:?output path required}"
ffmpeg -nostdin -hide_banner \
  -f lavfi -i "testsrc2=size=1920x1080:rate=30:duration=10" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=10" \
  -vf "drawbox=x='200+100*t':y=250:w=300:h=500:color=white@0.8:t=fill" \
  -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest -movflags +faststart -y "$OUT"
```

- [ ] Run generator then test; expect pipeline test still FAIL at absent renderer harness, proving fixture itself is valid.

- [ ] **GREEN:** harness invokes Task 11 probe/extract, Task 18 fixed fake detector track, Task 19 render spec with two cues, Task 21 preview, Task 22 software full render, MinIO local adapter, then ffprobe. Caption pixel difference compares a frame during cue with same source frame rendered without subtitle filter.

- [ ] Run media test; expect PASS.

- [ ] **RED/GREEN additional matrix:** MOV/MKV/WebM probes, unsupported AVI rejection, malformed file, exact trim, source audio preservation, Unicode/ASS escaping, center fallback, manual focus, independent one-of-two render failure, SRT/ZIP contents, subprocess cancellation/partial cleanup.

- [ ] **REFACTOR:** fixture output lives under `.artifacts/media-fixtures`, is regenerated when absent, records FFmpeg version/hash, and failure artifact retention is 3 days in CI.

## Verification and commit

```bash
PATH="$PWD/.tools/bin:$PATH" tests/fixtures/media/generate-source.sh .artifacts/media-fixtures/talking-head.mp4
pnpm test:media
ffprobe -v error -show_streams -show_format -of json .artifacts/media-fixtures/final.mp4
git status --short --ignored .artifacts/media-fixtures
git diff --check
```

Expected: deterministic synthetic source covers full local media path and generated binaries remain ignored.

**Suggested commit:** `test: add synthetic media pipeline integration`
