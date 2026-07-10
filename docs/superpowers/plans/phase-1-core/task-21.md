# Task 21: Generate Preview and Filmstrip Artifacts from the Shared Spec

> **For agentic workers:** Use superpowers:test-driven-development. Preview receives the Task 19 spec; it does not invent a second caption/crop model.

## Purpose and traceability

Implement preview generation portions of design §§14–17: fast local vertical previews and thumbnails for AI/manual candidates with timing/layout parity.

## Boundaries and files

- Requires Tasks 9, 18–20.
- Create: `apps/worker/src/clip_factory/ports/preview_renderer.py`
- Create: `apps/worker/src/clip_factory/application/generate_preview.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_preview_renderer.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/preview_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/preview_mapper.py`
- Test: `apps/worker/tests/application/test_generate_preview.py`
- Test: `apps/worker/tests/adapters/media/test_ffmpeg_preview_renderer.py`
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

- [ ] Run `uv run --directory apps/worker pytest tests/application/test_generate_preview.py -q`; expect import FAIL.

- [ ] **GREEN:** create `PreviewRendererPort.render(spec,destination,width=360,height=640)` and `.thumbnail(preview,destination,timeMs=0)`; service writes generated temp files through `ArtifactStorePort`, verifies SHA-256/probe, and returns references. Keys are exactly those asserted.

- [ ] Run service test; expect PASS.

- [ ] **RED: adapter argv invariant.** Assert FFmpeg receives clip range, crop expression compiled from `cropTrack`, scale/pad `360:640`, shared ASS subtitle file, source audio, H.264 baseline preview and AAC, with argv list and no shell.

- [ ] **GREEN:** compile spec through shared `RenderSpecCompiler`; preview profile is `-vf <crop,scale,ass> -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart`. Thumbnail uses `-frames:v 1 -q:v 2`. Parse progress to media milliseconds.

- [ ] **RED/GREEN callback:** invalid/missing object reference returns typed failure; duplicate callback is idempotent; successful callback transitions clip to `PREVIEW_READY` and retains algorithm/spec version.

- [ ] **REFACTOR:** compare preview cue start/end and crop-point interpolation against spec with ±1 ms/±1 micro tolerance; no pixel-perfect guarantee is asserted.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/application/test_generate_preview.py tests/adapters/media/test_ffmpeg_preview_renderer.py -q
pnpm exec vitest run apps/web/src/modules/clips
pnpm test:contracts
git diff --check
```

Expected: preview/thumbnail are scoped, validated, and derived from exactly the final render spec model.

**Suggested commit:** `feat: generate shared-spec clip previews`
