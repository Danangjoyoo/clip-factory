# Task 18: Smart Vertical Reframe and Manual Focal Override

> **For agentic workers:** Use superpowers:test-driven-development. Proxy analysis and model inference are activities/adapters; smoothing/fallback policy is pure domain code.

## Purpose and traceability

Implement design §14: low-resolution subject tracks, dominant subject selection, temporal smoothing, stable center fallback, reproducible algorithm version, and per-clip manual focal override.

## Boundaries and files

- Requires Tasks 5, 11–13.
- Create: `apps/worker/src/clip_factory/domain/reframe.py`
- Create: `apps/worker/src/clip_factory/ports/subject_detector.py`
- Create: `apps/worker/src/clip_factory/ports/proxy_frames.py`
- Create: `apps/worker/src/clip_factory/application/build_crop_track.py`
- Create: `apps/worker/src/clip_factory/adapters/tracking/face_detector.py`
- Create: `apps/worker/src/clip_factory/adapters/tracking/proxy_frames.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/reframe_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/reframe_mapper.py`
- Test: `apps/worker/tests/domain/test_reframe.py`
- Test: `apps/worker/tests/application/test_build_crop_track.py`
- Test: `apps/worker/tests/adapters/tracking/test_face_detector.py`
- Test: `apps/worker/tests/adapters/tracking/test_proxy_frames.py`
- Create: `apps/web/src/modules/clips/application/dto/entity/frame-configuration-entity.dto.ts`
- Create: `apps/web/src/modules/clips/application/services/set-focal-point.service.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/dto/record/frame-configuration-record.dto.ts`
- Create: `apps/web/src/modules/clips/delivery/http/dto/api/focal-point-api.dto.ts`
- Create: `apps/web/src/modules/clips/delivery/http/focal-point.controller.ts`
- Create: `apps/web/src/modules/clips/converters/api-entity/focal-point.converter.ts`
- Create: `apps/web/src/modules/clips/converters/entity-record/frame-configuration.converter.ts`
- Create: `apps/web/src/app/api/clips/[clipId]/focal-point/route.ts`
- Test: `apps/web/src/modules/clips/application/services/set-focal-point.service.test.ts`
- Test: `apps/web/src/modules/clips/converters/api-entity/focal-point.converter.test.ts`
- Test: `apps/web/src/modules/clips/converters/entity-record/frame-configuration.converter.test.ts`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Pin `mediapipe==0.10.35` behind the native macOS dependency marker; CI uses the deterministic subject-detector fake.
- Adapter detector boxes never cross the Client→domain converter.

## RED → GREEN → REFACTOR

- [ ] **RED: smoothing and fallback tests.**

```python
def test_crop_track_smooths_jitter_and_uses_center_after_low_confidence() -> None:
    observations = (
        observation(0, x=400_000, y=450_000, confidence=900_000),
        observation(100, x=600_000, y=450_000, confidence=900_000),
        observation(200, x=900_000, y=450_000, confidence=100_000),
    )
    track = build_crop_track(observations, alpha_micros=250_000, confidence_floor=500_000)
    assert [(p.time_ms, p.center_x_micros, p.source) for p in track] == [
        (0, 400_000, "SUBJECT_TRACK"),
        (100, 450_000, "SUBJECT_TRACK"),
        (200, 462_500, "CENTER_FALLBACK"),
    ]
```

- [ ] Run `uv run --directory apps/worker pytest tests/domain/test_reframe.py -q`; expect import FAIL.

- [ ] **GREEN: create deterministic fixed-point smoothing.**

```python
def lerp(previous: int, target: int, alpha_micros: int) -> int:
    return previous + ((target - previous) * alpha_micros) // 1_000_000

def build_crop_track(observations: Sequence[SubjectObservation], alpha_micros: int, confidence_floor: int) -> Sequence[CropPoint]:
    points: list[CropPoint] = []
    x = 500_000
    y = 500_000
    for item in observations:
        confident = item.confidence_micros >= confidence_floor
        target_x = item.center_x_micros if confident else 500_000
        target_y = item.center_y_micros if confident else 500_000
        x = target_x if not points else lerp(x, target_x, alpha_micros)
        y = target_y if not points else lerp(y, target_y, alpha_micros)
        points.append(CropPoint(item.time_ms, x, y, item.confidence_micros, "SUBJECT_TRACK" if confident else "CENTER_FALLBACK"))
    return tuple(points)
```

- [ ] Run domain test; expect PASS. Add rows for no faces, two faces with dominant speaking score, track disappearance/reappearance, coordinate clamping, and monotonic times.

- [ ] **RED: proxy-analysis test.** For a 1920×1080, 30 fps, 60-second clip, assert proxy width 640, derived height 360, sample rate 5 fps, exactly 300 detector calls, and no source write.

- [ ] **GREEN:** `ProxyFramePort.frames(source, range, width=640, fps=5)` uses FFmpeg argv; `SubjectDetectorPort.detect(frame)` returns boxes/confidence/speaking probability; `BuildCropTrack` selects maximum `0.6*speaking + 0.3*area + 0.1*centerProximity`, smooths with alpha 250000, and emits `algorithmVersion='reframe-v1'` plus proxy probe.

- [ ] **RED: manual override test.** Point `(0.25,0.40)` maps to fixed-point `(250000,400000)`, replaces automatic points across the clip with source `MANUAL_FOCAL_POINT`, rejects outside `[0,1]`, and leaves the original track in render history.

- [ ] **GREEN:** TS `SetFocalPointService.execute({clipId,xMicros,yMicros})` validates integers `0..1000000`, writes a new current `frameJson` with preserved `automaticTrack` and `manualFocalPoint`, and schedules preview regeneration through `ClipPreparationPort`. API accepts decimals as strings and converter rounds half-up to micros.

- [ ] **REFACTOR:** record detector name/revision, proxy parameters, algorithm version, confidence threshold, and smoothing alpha. Default logs include only clip/stage identifiers.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_reframe.py tests/application/test_build_crop_track.py tests/adapters/tracking -q
pnpm exec vitest run apps/web/src/modules/clips/application/services/set-focal-point.service.test.ts
pnpm test:architecture
git diff --check
```

Expected: tracks are stable and reproducible, low confidence centers safely, and manual focus is visible without destroying provenance.

**Suggested commit:** `feat: add smart vertical reframing`
