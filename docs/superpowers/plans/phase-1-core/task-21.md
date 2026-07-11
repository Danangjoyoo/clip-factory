# Task 21: Generate Preview and Filmstrip Artifacts from the Shared Spec

> **For agentic workers:** Use superpowers:test-driven-development. Preview receives the Task 19 spec; it does not invent a second caption/crop model.

## Purpose and traceability

Implement preview generation portions of design §§14–17: fast local vertical previews and thumbnails for AI/manual candidates with timing/layout parity.

## Boundaries and files

- Requires Tasks 10–11 and 18–20.
- Preview activities receive only the immutable Task 19 source snapshot. The adapter-private `SourceMediaLease` resolves Task 10's authenticated locator at activity execution time, verifies the snapshot, and yields a local read-only path that never crosses the application/domain/Temporal boundary.
- Create: `apps/worker/src/clip_factory/ports/preview_renderer.py`
- Create: `apps/worker/src/clip_factory/ports/render_spec_compiler.py`
- Create: `apps/worker/src/clip_factory/application/generate_preview.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_preview_renderer.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_render_spec_compiler.py`
- Reuse: `apps/worker/src/clip_factory/adapters/media/source_media_lease.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/preview_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/preview_mapper.py`
- Test: `apps/worker/tests/application/test_generate_preview.py`
- Test: `apps/worker/tests/adapters/media/test_ffmpeg_preview_renderer.py`
- Test: `apps/worker/tests/adapters/media/test_source_media_lease.py`
- Test: `apps/worker/tests/entrypoints/temporal/activities/test_preview_activities.py`
- Modify: `apps/web/src/modules/clips/application/dto/entity/clip-entity.dto.ts`
- Modify: `apps/web/src/modules/clips/delivery/http/dto/api/add-clip-api.dto.ts`
- Test: `apps/web/src/modules/clips/delivery/http/clip.controller.test.ts`
- Extend clip preparation callback Entity/API converters with preview/thumbnail object references only.

## RED → GREEN → REFACTOR

- [ ] **RED: application artifact behavior.**

```python
async def test_preview_uses_shared_spec_and_project_scoped_outputs() -> None:
    renderer = RecordingPreviewRenderer()
    store = InMemoryArtifactStore()
    service = GeneratePreview(renderer, store)
    result = await service.execute(preview_command(render_id=RENDER_ID, clip_id=CLIP_ID))
    assert renderer.specs == [preview_command(render_id=RENDER_ID, clip_id=CLIP_ID).render_spec]
    assert result.preview.key == f"projects/{PROJECT_ID}/clips/{CLIP_ID}/preview.mp4"
    assert result.thumbnail.key == f"projects/{PROJECT_ID}/clips/{CLIP_ID}/thumbnail.jpg"
    assert result.probe.width == 360 and result.probe.height == 640
```

- [ ] Create compile-safe preview ports/result dataclasses and a `GeneratePreview.execute` shell returning placeholder references without invoking the renderer, verify collection passes, then run the test; expect the named renderer-spec assertion to FAIL with no recorded spec.

- [ ] **GREEN:** define `PreviewRendererPort.render(spec,destination,width=360,height=640)` and `.thumbnail(preview,destination,timeMs=0)` in `ports/preview_renderer.py`; implement `GeneratePreview.execute` in `application/generate_preview.py` to write through `ArtifactStorePort`, verify SHA-256/probe, and return the exact asserted object keys. The port accepts a snapshot, never a filesystem path. Run `uv run --directory apps/worker pytest tests/application/test_generate_preview.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
# Expected: PASS
```

- [ ] Run `uv run --directory apps/worker pytest tests/application/test_generate_preview.py -q`; expect PASS.

- [ ] **RED: adapter argv invariant.** Assert FFmpeg receives clip range, crop expression compiled from `cropTrack`, scale/pad `360:640`, shared ASS subtitle file, source audio, H.264 baseline preview and AAC, with argv list and no shell.

- [ ] **GREEN:** define application-owned `RenderSpecCompiler.compile(spec: RenderSpec, profile: RenderProfile) -> CompiledRenderSpec` in `ports/render_spec_compiler.py`; `CompiledRenderSpec` contains filter arguments and encoder arguments but no source/destination path. Implement `FfmpegRenderSpecCompiler` in the media adapter and inject it into `FfmpegPreviewRenderer`; Task 22 reuses this exact port/adapter. Preview profile is `-vf <crop,scale,ass> -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart`. Thumbnail uses `-frames:v 1 -q:v 2`. Parse progress to media milliseconds. Run `uv run --directory apps/worker pytest tests/adapters/media/test_ffmpeg_preview_renderer.py tests/application/test_generate_preview.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
# Expected: PASS
```

- [ ] **RED:** add `test_source_media_lease.py` cases for local success/mismatch and upload success/mismatch/cancel/FFmpeg failure/process termination; each asserts the named `SOURCE_CHANGED` or cleanup invariant. Run `uv run --directory apps/worker pytest tests/adapters/media/test_source_media_lease.py -q`; expect the named local fingerprint assertion to FAIL with the shell lease.

- [ ] **GREEN:** implement `SourceMediaLease.__aenter__/__aexit__` in `adapters/media/source_media_lease.py`: for `LOCAL_FILE`, fetch the internal locator, require exact fingerprint/size/normalized mtime, open read-only, and never copy/delete; for `BROWSER_UPLOAD`, download exact key/version into `0700` activity directory as `0600`, verify SHA-256, and remove every temp/partial file in `finally`. Run `uv run --directory apps/worker pytest tests/adapters/media/test_source_media_lease.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
# Expected: PASS
```

- [ ] **RED:** add callback tests for invalid/missing object reference, duplicate delivery, and preserved algorithm/spec version; run `pnpm exec vitest run apps/web/src/modules/clips/delivery/http/clip.controller.test.ts`; expect the named `PREVIEW_READY` transition assertion to FAIL with the shell callback.

- [ ] **GREEN:** implement the preview-result API→Entity converter and `ApplyPreviewResultService` so invalid/missing references return typed failure, duplicate callback is idempotent, and a valid callback transitions exactly to `PREVIEW_READY` while retaining algorithm/spec version. Run `pnpm exec vitest run apps/web/src/modules/clips/delivery/http/clip.controller.test.ts apps/web/src/modules/clips/application -t "preview"`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
# Expected: PASS
```

- [ ] **REFACTOR:** move all shared crop/caption filter compilation into `FfmpegRenderSpecCompiler`, compare preview cue start/end and crop-point interpolation against spec with ±1 ms/±1 micro tolerance, and assert no pixel-perfect guarantee. Re-run `uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q`; expect PASS.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
# Expected: PASS
```

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py tests/adapters/media/test_source_media_lease.py -q
pnpm exec vitest run apps/web/src/modules/clips
pnpm test:contracts
git diff --check
```

Expected: preview/thumbnail are scoped, validated, and derived from exactly the final render spec model.

**Suggested commit:** `feat: generate shared-spec clip previews`
