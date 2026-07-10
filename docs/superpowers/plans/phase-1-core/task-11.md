# Task 11: Probe Sources and Extract Local Speech Audio

> **For agentic workers:** Use superpowers:test-driven-development. Test argv values directly and reject any adapter that invokes a shell.

## Purpose and traceability

Implement design §§9 and 12 plus privacy controls in §24: early source validation and normalized local speech audio before any paid analysis.

## Boundaries and files

- Requires Tasks 5 and 10.
- Domain owns `MediaProbe` and source limits. Application owns `SourcePreprocessorPort.prepare(sourceAssetId, projectId, heartbeat) -> PreparedSource`, whose result contains a sanitized probe and MinIO audio object reference only. The adapter resolves/materializes the source, runs ffprobe/FFmpeg, uploads audio, posts Task 8's media-validation update, and cleans private temp files without returning any path.
- Create: `apps/worker/src/clip_factory/domain/media.py`
- Create: `apps/worker/src/clip_factory/ports/source_preprocessor.py`
- Create: `apps/worker/src/clip_factory/ports/process_runner.py`
- Create: `apps/worker/src/clip_factory/application/preprocess_source.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffprobe_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/media/ffmpeg_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/media/source_preprocessor_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/storage/minio_object_materializer.py`
- Create: `apps/worker/src/clip_factory/adapters/process/asyncio_process_runner.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/media_activities.py`
- Test: `apps/worker/tests/domain/test_media.py`
- Test: `apps/worker/tests/application/test_preprocess_source.py`
- Test: `apps/worker/tests/adapters/media/test_ffprobe_adapter.py`
- Test: `apps/worker/tests/adapters/media/test_ffmpeg_adapter.py`
- Test: `apps/worker/tests/adapters/media/test_source_preprocessor_adapter.py`
- Test: `apps/worker/tests/adapters/storage/test_minio_object_materializer.py`
- Test: `apps/worker/tests/adapters/process/test_asyncio_process_runner.py`
- Test: `apps/worker/tests/entrypoints/temporal/activities/test_media_activities.py`
- Create `tests/fixtures/media/generate-source.sh`; it generates fixtures and does not commit binary user media.

## Fixed interfaces

```python
@dataclass(frozen=True)
class MediaProbe:
    duration_ms: int
    size_bytes: int
    container: str
    video_codec: str
    width: int
    height: int
    frame_rate_numerator: int
    frame_rate_denominator: int
    audio_codec: str | None
    sample_rate_hz: int | None

@dataclass(frozen=True)
class PreparedSource:
    source_asset_id: UUID
    probe: MediaProbe
    audio_object: ObjectReference

class SourcePreprocessorPort(Protocol):
    async def prepare(self, source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback) -> PreparedSource:
        raise NotImplementedError
```

## RED → GREEN → REFACTOR

- [ ] **RED: write exact acceptance table.** MP4/MOV/MKV/WebM at `10800000` ms and `10737418240` bytes pass; one millisecond/byte above fails; AVI fails; absent video, malformed JSON, zero duration, and absent audio fail with distinct codes.

```python
@pytest.mark.parametrize(("probe", "code"), [
    (valid_probe(container="avi"), "UNSUPPORTED_CONTAINER"),
    (valid_probe(duration_ms=10_800_001), "SOURCE_TOO_LONG"),
    (valid_probe(size_bytes=10_737_418_241), "SOURCE_TOO_LARGE"),
    (valid_probe(video_codec=""), "VIDEO_STREAM_REQUIRED"),
    (valid_probe(audio_codec=None), "AUDIO_STREAM_REQUIRED"),
])
def test_source_limit_failures_are_actionable(probe: MediaProbe, code: str) -> None:
    with pytest.raises(MediaValidationError) as error:
        validate_probe(probe)
    assert error.value.code == code
```

- [ ] Run `uv run --directory apps/worker pytest tests/domain/test_media.py -q`; expect import FAIL.

- [ ] **GREEN: add exact constants and validation.**

```python
ALLOWED_CONTAINERS = frozenset({"mp4", "mov", "matroska", "webm"})
MAX_DURATION_MS = 3 * 60 * 60 * 1000
MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024

def validate_probe(probe: MediaProbe) -> None:
    if probe.container not in ALLOWED_CONTAINERS: raise MediaValidationError("UNSUPPORTED_CONTAINER")
    if probe.duration_ms <= 0 or probe.duration_ms > MAX_DURATION_MS: raise MediaValidationError("SOURCE_TOO_LONG")
    if probe.size_bytes <= 0 or probe.size_bytes > MAX_SIZE_BYTES: raise MediaValidationError("SOURCE_TOO_LARGE")
    if not probe.video_codec: raise MediaValidationError("VIDEO_STREAM_REQUIRED")
    if not probe.audio_codec: raise MediaValidationError("AUDIO_STREAM_REQUIRED")
```

- [ ] Run domain tests; expect PASS.

- [ ] **RED: assert FFmpeg argv and no shell.**

```python
async def test_extract_speech_uses_normalized_mono_pcm_argv() -> None:
    runner = RecordingProcessRunner()
    adapter = FfmpegAdapter(runner, Path("/tools/ffmpeg"))
    await adapter.extract_speech(Path("/safe/input.mov"), Path("/tmp/audio.wav"), no_progress)
    assert runner.calls == [["/tools/ffmpeg", "-nostdin", "-hide_banner", "-i", "/safe/input.mov", "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-progress", "pipe:1", "-y", "/tmp/audio.wav"]]
    assert runner.shell_used is False
```

- [ ] Run adapter tests; expect import FAIL.

- [ ] **GREEN:** create `ProcessRunner.run(argv: Sequence[str], on_stdout_line, cancellation)` using `asyncio.create_subprocess_exec(*argv, stdout=PIPE, stderr=PIPE, start_new_session=True)`. Parse ffprobe JSON with Pydantic Client models, convert to domain explicitly, and use the exact extraction argv asserted above.

- [ ] Run adapter tests; expect PASS.

- [ ] **RED: prove locator materialization and activity payload privacy.** A local locator must be opened read-only without copying/deleting it; an uploaded object must download into a mode-`0600` file below a mode-`0700` per-activity temp directory, verify object version/SHA-256, and remove the directory on success, failure, and cancellation. Assert the activity input contains only source/project IDs and its result contains only the probe plus `projects/<projectId>/audio/<sourceAssetId>.wav` object reference. Serialize Temporal history and assert no `/Users/`, temp path, or source object capability URL occurs.

- [ ] **GREEN:** implement `SourcePreprocessorAdapter` with Task 10's adapter-private `SourceLocatorClient`, a focused reusable `MinioObjectMaterializer`, ffprobe/FFmpeg helpers, and `MinioArtifactStore`. It keeps every `Path` inside the adapter context, uploads normalized audio before returning, posts `{sourceAssetId,probe}` to Task 8's authenticated media-validation action to transition `LOCATED -> HEALTHY`, and returns `PreparedSource`. Duplicate activity execution heads/verifies the deterministic audio object and idempotent validation receipt before reusing it; it never re-extracts a verified artifact.

- [ ] **REFACTOR:** parse `out_time_ms` heartbeats into measured media milliseconds, redact path-bearing stderr, cap captured stderr at 64 KiB, and map exit/non-JSON/materialization/hash errors to typed failures. Add a port-contract test shared by the fake and real `SourcePreprocessorPort`, and assert application/domain modules contain no `Path`, MinIO client, source locator Client DTO, or subprocess type.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_media.py tests/adapters/media -q
uv run --directory apps/worker mypy src tests
uv run --directory apps/worker lint-imports
git diff --check
```

Expected: commands are argv arrays, limits are exact, and no raw path appears in default errors.

**Suggested commit:** `feat: validate media and extract local speech audio`
