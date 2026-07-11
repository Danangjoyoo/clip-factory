# Task 22: Render Full-Resolution H.264/AAC Clips with Burned Captions

> **For agentic workers:** Use superpowers:test-driven-development. The software path is deterministic CI truth; VideoToolbox is native quality acceleration selected only after capability probing.

## Purpose and traceability

Implement design §18: 1080×1920 output, source audio, ASS/libass captions, immutable inputs, quality-first VideoToolbox and deterministic software fallback.

## Boundaries and files

- Requires Tasks 11, 19, and 21.
- Reuse: `apps/worker/src/clip_factory/ports/render_spec_compiler.py`
- Reuse: `apps/worker/src/clip_factory/adapters/media/ffmpeg_render_spec_compiler.py`
- Create: `apps/worker/src/clip_factory/domain/render.py`
- Create: `apps/worker/src/clip_factory/ports/render_engine.py`
- Create: `apps/worker/src/clip_factory/application/render_clip.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ass_compiler.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_render_engine.py`
- Create: `apps/worker/src/clip_factory/adapters/media/encoder_probe.py`
- Reuse: `apps/worker/src/clip_factory/adapters/media/source_media_lease.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/render_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/render_mapper.py`
- Test: `apps/worker/tests/domain/test_render.py`
- Test: `apps/worker/tests/application/test_render_clip.py`
- Test: `apps/worker/tests/adapters/media/test_ass_compiler.py`
- Test: `apps/worker/tests/adapters/media/test_ffmpeg_render_engine.py`
- Test: `apps/worker/tests/adapters/media/test_encoder_probe.py`
- Modify: `apps/worker/tests/adapters/media/test_source_media_lease.py`
- Create: `apps/web/src/modules/rendering/application/dto/entity/render-entity.dto.ts`
- Create: `apps/web/src/modules/rendering/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/rendering/application/ports/render.repository.ts`
- Create: `apps/web/src/modules/rendering/application/data-services/render.data-service.ts`
- Create: `apps/web/src/modules/rendering/application/services/queue-render.service.ts`
- Create: `apps/web/src/modules/rendering/adapters/persistence/dto/record/render-record.dto.ts`
- Create: `apps/web/src/modules/rendering/adapters/persistence/repositories/prisma-render.repository.ts`
- Create: `apps/web/src/modules/rendering/delivery/http/dto/api/render-api.dto.ts`
- Create: `apps/web/src/modules/rendering/delivery/http/render.controller.ts`
- Create: `apps/web/src/modules/rendering/converters/api-entity/render.converter.ts`
- Create: `apps/web/src/modules/rendering/adapters/persistence/converters/render.converter.ts`
- Create: `apps/web/src/modules/rendering/composition/rendering.composition.ts`
- Create: `apps/web/src/app/api/clips/[clipId]/renders/route.ts`
- Create: `apps/web/src/app/api/internal/v1/renders/[renderId]/result/route.ts`
- Test: `apps/web/src/modules/rendering/application/services/queue-render.service.test.ts`
- Test: `apps/web/src/modules/rendering/converters/api-entity/render.converter.test.ts`
- Test: `apps/web/src/modules/rendering/adapters/persistence/converters/render.converter.test.ts`
- Test: `apps/web/src/modules/rendering/adapters/persistence/repositories/prisma-render.repository.test.ts`
- Test: `apps/web/src/modules/rendering/delivery/http/render.controller.test.ts`

## RED → GREEN → REFACTOR

- [ ] **RED: deterministic ASS generation.** A two-cue document must produce exact `[Script Info]`, PlayResX 1080, PlayResY 1920, one style line, dialogue times rounded to centiseconds, escaped braces/backslashes/newlines, and active word `\c&H` transitions.

- [ ] Create compile-safe ASS compiler/renderer shells that return empty output/argv, verify collection passes, then run the test; expect the named ASS timestamp/style assertion to FAIL with an empty document.

- [ ] **GREEN:** implement `compile_ass(spec, font_directory)` in `adapters/media/ass_compiler.py` returning UTF-8 text; convert `#RRGGBBAA` to `&HAABBGGRR`, map vertical micros into safe-area pixel bounds, split at `maxWordsPerLine`, use `\k` centiseconds, and reject fonts outside the local catalog. Run `uv run --directory apps/worker pytest tests/adapters/media/test_ass_compiler.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
# Expected: PASS
```

- [ ] Run `uv run --directory apps/worker pytest tests/adapters/media/test_ass_compiler.py -q`; expect PASS.

- [ ] **RED: exact encoder argv tests.** Software expects `libx264`, `-preset slow`, `-crf 18`, `yuv420p`, AAC 192k, faststart; native expects `h264_videotoolbox`, `-q:v 65`, `-allow_sw 0`; both map source audio, apply shared filter graph, output MP4, and use no shell.

- [ ] **GREEN:** implement `EncoderProbe.select` in `encoder_probe.py` to parse `ffmpeg -encoders` and run the one-second capability probe, then implement `FfmpegRenderEngine.render` in `ffmpeg_render_engine.py` using adapter-private `SourceMediaLease`, a `0700` temp directory, argv-only execution, cleanup in `finally`, and path-free encoder telemetry. `RenderClip` and Temporal payloads accept no raw path. Run `uv run --directory apps/worker pytest tests/adapters/media/test_ffmpeg_render_engine.py tests/adapters/media/test_encoder_probe.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
# Expected: PASS
```

- [ ] Run `uv run --directory apps/worker pytest tests/adapters/media/test_ffmpeg_render_engine.py tests/adapters/media/test_encoder_probe.py -q`; expect PASS.

- [ ] **RED: immutable render behavior.** Editing clip after queue does not change `inputSnapshotJson`; duplicate render ID returns prior result; local snapshot mismatch fails `SOURCE_CHANGED` before FFmpeg; uploaded object is fetched at the exact key/version and hash; successful object is probed for 1080×1920, H.264, AAC, MP4, duration within 100 ms; mismatch becomes `RENDER_OUTPUT_INVALID`. Serialize queued Temporal input/history and assert no local/temp path or presigned URL occurs.

- [ ] **GREEN:** implement `QueueRenderService.execute` in `apps/web/src/modules/rendering/application/services/queue-render.service.ts` to validate edit, persist immutable snapshot/probes/settings, and signal Task 13's `RenderBatchPort.queue(workflowId,batchId,renderIds)` with one ID; implement `RenderClip.execute` in `apps/worker/src/clip_factory/application/render_clip.py` to consume only snapshot contract, upload the exact render key, probe it, and post idempotent result. Return `PROJECT_WORKFLOW_NOT_ACTIVE` if the port reports no live workflow. Run `pnpm exec vitest run apps/web/src/modules/rendering/application/services/queue-render.service.test.ts apps/web/src/modules/rendering/adapters/persistence/repositories/prisma-render.repository.test.ts && uv run --directory apps/worker pytest tests/application/test_render_clip.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
# Expected: PASS
```

- [ ] **REFACTOR:** in `ffmpeg_render_engine.py`, send SIGTERM to the process group, wait 10 seconds with injected clock, then SIGKILL; remove temp/materialized upload/partial object and preserve completed immutable artifacts. Add fake-clock tests proving the user's local file is never deleted. Re-run `uv run --directory apps/worker pytest tests/application/test_render_clip.py tests/adapters/media/test_ffmpeg_render_engine.py tests/adapters/media/test_ass_compiler.py -q && pnpm exec vitest run apps/web/src/modules/rendering && pnpm test:architecture`; expect PASS.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
# Expected: PASS
```

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
pnpm exec vitest run apps/web/src/modules/rendering
pnpm test:architecture
git diff --check
```

Expected: render snapshot is immutable and output invariants are probed before completion.

**Suggested commit:** `feat: render vertical clips with burned captions`
