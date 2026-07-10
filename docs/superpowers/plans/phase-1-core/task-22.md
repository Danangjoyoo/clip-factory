# Task 22: Render Full-Resolution H.264/AAC Clips with Burned Captions

> **For agentic workers:** Use superpowers:test-driven-development. The software path is deterministic CI truth; VideoToolbox is native quality acceleration selected only after capability probing.

## Purpose and traceability

Implement design §18: 1080×1920 output, source audio, ASS/libass captions, immutable inputs, quality-first VideoToolbox and deterministic software fallback.

## Boundaries and files

- Requires Tasks 11, 19, and 21.
- Create: `apps/worker/src/clip_factory/domain/render.py`
- Create: `apps/worker/src/clip_factory/ports/render_engine.py`
- Create: `apps/worker/src/clip_factory/application/render_clip.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ass_compiler.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_render_engine.py`
- Create: `apps/worker/src/clip_factory/adapters/media/encoder_probe.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/render_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/render_mapper.py`
- Test: `apps/worker/tests/domain/test_render.py`
- Test: `apps/worker/tests/application/test_render_clip.py`
- Test: `apps/worker/tests/adapters/media/test_ass_compiler.py`
- Test: `apps/worker/tests/adapters/media/test_ffmpeg_render_engine.py`
- Test: `apps/worker/tests/adapters/media/test_encoder_probe.py`
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
- Create: `apps/web/src/modules/rendering/converters/entity-record/render.converter.ts`
- Create: `apps/web/src/modules/rendering/composition/rendering.composition.ts`
- Create: `apps/web/src/app/api/clips/[clipId]/renders/route.ts`
- Create: `apps/web/src/app/api/internal/v1/renders/[renderId]/result/route.ts`
- Test: `apps/web/src/modules/rendering/application/services/queue-render.service.test.ts`
- Test: `apps/web/src/modules/rendering/converters/api-entity/render.converter.test.ts`
- Test: `apps/web/src/modules/rendering/converters/entity-record/render.converter.test.ts`
- Test: `apps/web/src/modules/rendering/adapters/persistence/repositories/prisma-render.repository.test.ts`
- Test: `apps/web/src/modules/rendering/delivery/http/render.controller.test.ts`

## RED → GREEN → REFACTOR

- [ ] **RED: deterministic ASS generation.** A two-cue document must produce exact `[Script Info]`, PlayResX 1080, PlayResY 1920, one style line, dialogue times rounded to centiseconds, escaped braces/backslashes/newlines, and active word `\c&H` transitions.

- [ ] Run `uv run --directory apps/worker pytest tests/adapters/media/test_ass_compiler.py -q`; expect import FAIL.

- [ ] **GREEN:** create `compile_ass(spec, font_directory)` returning UTF-8 text. Convert `#RRGGBBAA` to ASS `&HAABBGGRR`, map vertical micros into safe-area pixel bounds, split at `maxWordsPerLine`, and use `\k` centiseconds for active-word emphasis. Reject fonts outside the local catalog.

- [ ] Run ASS golden test; expect PASS.

- [ ] **RED: exact encoder argv tests.** Software expects `libx264`, `-preset slow`, `-crf 18`, `yuv420p`, AAC 192k, faststart; native expects `h264_videotoolbox`, `-q:v 65`, `-allow_sw 0`; both map source audio, apply shared filter graph, output MP4, and use no shell.

- [ ] **GREEN:** `EncoderProbe` parses `ffmpeg -encoders`; choose VideoToolbox only when present and a 1-second capability probe exits 0, otherwise software. `FfmpegRenderEngine` writes ASS to private temp directory, executes argv, cleans temp files in `finally`, and records complete argv-safe encoder settings without paths.

- [ ] Run adapter tests; expect PASS.

- [ ] **RED: immutable render behavior.** Editing clip after queue does not change `inputSnapshotJson`; duplicate render ID returns prior result; successful object is probed for 1080×1920, H.264, AAC, MP4, duration within 100 ms; mismatch becomes `RENDER_OUTPUT_INVALID`.

- [ ] **GREEN:** `QueueRenderService` validates current edit, serializes full render spec/probes/settings into a new Render row, then sends Task 13 `queue_render_batch` to the live project workflow with a one-render batch ID. Worker `RenderClip` consumes only snapshot contract, uploads `projects/<projectId>/renders/<renderId>.mp4`, probes uploaded output, and posts idempotent result. If the project workflow is not running, return `PROJECT_WORKFLOW_NOT_ACTIVE`; do not start an unrelated workflow silently.

- [ ] **REFACTOR:** cancellation sends SIGTERM to process group, waits 10 seconds, sends SIGKILL, removes temp/partial object, and preserves completed immutable artifacts. Tests use fake process clock.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_render.py tests/application/test_render_clip.py tests/adapters/media/test_ass_compiler.py tests/adapters/media/test_ffmpeg_render_engine.py -q
pnpm exec vitest run apps/web/src/modules/rendering
pnpm test:architecture
git diff --check
```

Expected: render snapshot is immutable and output invariants are probed before completion.

**Suggested commit:** `feat: render vertical clips with burned captions`
