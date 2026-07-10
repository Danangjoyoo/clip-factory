# Task 12: Transcribe Locally with Word Timestamps

> **For agentic workers:** Use superpowers:test-driven-development. The fake and MLX adapter must obey the same application-owned port.

## Purpose and traceability

Implement design §§10 and 12: explicit user language, local large-v3-quality transcription, source-language word timestamps, artifact storage, and provenance.

## Boundaries and files

- Requires Tasks 5, 8, 9, and 11.
- Create: `apps/worker/src/clip_factory/domain/transcript.py`
- Create: `apps/worker/src/clip_factory/ports/transcriber.py`
- Create: `apps/worker/src/clip_factory/ports/artifact_store.py`
- Create: `apps/worker/src/clip_factory/ports/clock.py`
- Create: `apps/worker/src/clip_factory/application/transcribe_source.py`
- Create: `apps/worker/src/clip_factory/adapters/transcription/fake_transcriber.py`
- Create: `apps/worker/src/clip_factory/adapters/transcription/model_manifest.py`
- Create: `apps/worker/src/clip_factory/adapters/transcription/model_cache.py`
- Create: `apps/worker/src/clip_factory/adapters/transcription/mlx_whisper_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/storage/minio_artifact_store.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/transcription_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/transcript_mapper.py`
- Test: `apps/worker/tests/domain/test_transcript.py`
- Test: `apps/worker/tests/application/test_transcribe_source.py`
- Test: `apps/worker/tests/adapters/transcription/test_fake_transcriber.py`
- Test: `apps/worker/tests/adapters/transcription/test_model_cache.py`
- Test: `apps/worker/tests/adapters/transcription/test_mlx_whisper_adapter.py`
- Test: `apps/worker/tests/adapters/storage/test_minio_artifact_store.py`
- Test: `apps/worker/tests/entrypoints/temporal/activities/test_transcription_activities.py`
- Create: `apps/web/src/modules/transcription/application/dto/entity/transcript-entity.dto.ts`
- Create: `apps/web/src/modules/transcription/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/transcription/application/ports/transcript.repository.ts`
- Create: `apps/web/src/modules/transcription/application/data-services/transcript.data-service.ts`
- Create: `apps/web/src/modules/transcription/adapters/persistence/dto/record/transcript-record.dto.ts`
- Create: `apps/web/src/modules/transcription/adapters/persistence/repositories/prisma-transcript.repository.ts`
- Create: `apps/web/src/modules/transcription/converters/entity-record/transcript.converter.ts`
- Create: `apps/web/src/modules/transcription/delivery/http/dto/api/transcript-result-api.dto.ts`
- Create: `apps/web/src/modules/transcription/converters/api-entity/transcript-result.converter.ts`
- Test: `apps/web/src/modules/transcription/application/data-services/transcript.data-service.test.ts`
- Test: `apps/web/src/modules/transcription/converters/entity-record/transcript.converter.test.ts`
- Test: `apps/web/src/modules/transcription/converters/api-entity/transcript-result.converter.test.ts`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Pin `mlx-whisper==0.4.3` behind marker `sys_platform == 'darwin' and platform_machine == 'arm64'`, `huggingface-hub==1.23.0`, and `minio==7.2.20`; Linux CI selects the fake transcriber and never imports MLX.
- Provider/MLX dictionaries stay in adapter Client models; transcript contract maps explicitly to domain and Entity models.

## Fixed port and values

```python
@dataclass(frozen=True)
class TranscriptWord:
    text: str
    start_ms: int
    end_ms: int
    confidence_micros: int | None

@dataclass(frozen=True)
class TranscriptDocument:
    language_tag: str
    text: str
    words: Sequence[TranscriptWord]
    segments: Sequence[TranscriptSegment]

class TranscriberPort(Protocol):
    async def transcribe(self, audio_object: ObjectReference, language_tag: str, progress: ProgressCallback) -> TranscriptDocument:
        raise NotImplementedError
```

## RED → GREEN → REFACTOR

- [ ] **RED: prove language, timestamps, and no translation.**

```python
async def test_transcribe_passes_explicit_language_and_persists_versioned_document() -> None:
    transcriber = FakeTranscriber(document=spanish_document())
    store = InMemoryArtifactStore()
    service = TranscribeSource(transcriber, store, clock=fixed_clock)
    result = await service.execute(TranscribeCommand(project_id=PROJECT_ID, audio_object=audio_reference(PROJECT_ID), language_tag="es"))
    assert transcriber.calls[0].language_tag == "es"
    assert result.object_key == f"projects/{PROJECT_ID}/transcripts/{result.transcript_id}.v1.json"
    assert result.word_count == 3
    assert store.json_objects[result.object_key]["words"][1] == {"text": "mundo", "startMs": 510, "endMs": 900, "confidenceMicros": 970000}
    assert "hello" not in store.json_objects[result.object_key]["text"]
```

- [ ] Run `uv run --directory apps/worker pytest tests/application/test_transcribe_source.py -q`; expect import FAIL.

- [ ] **GREEN: create the use case.**

```python
class TranscribeSource:
    def __init__(self, transcriber: TranscriberPort, store: ArtifactStorePort, clock: ClockPort) -> None:
        self._transcriber = transcriber
        self._store = store
        self._clock = clock

    async def execute(self, command: TranscribeCommand) -> TranscriptResult:
        started = self._clock.monotonic_ms()
        document = await self._transcriber.transcribe(command.audio_object, command.language_tag, command.progress)
        validate_document(document)
        transcript_id = command.transcript_id
        key = f"projects/{command.project_id}/transcripts/{transcript_id}.v1.json"
        reference = await self._store.put_json(key, transcript_to_contract(document))
        return TranscriptResult(transcript_id, reference.key, len(document.words), document.words[-1].end_ms, self._clock.monotonic_ms() - started)
```

- [ ] Run use-case test; expect PASS.

- [ ] **RED: table-test invalid output:** overlapping/decreasing timestamps, negative times, `end <= start`, segment outside duration, blank language, confidence outside `0..1000000`, and empty document each raise `INVALID_TRANSCRIPT`.

- [ ] **GREEN: implement `validate_document` as a linear scan that enforces those exact constraints and permits adjacent equal boundaries.** Add no translation branch or language detection fallback.

- [ ] Run domain tests; expect PASS.

- [ ] **RED: model-cache, audio materialization, and exact MLX-call tests.** Stub `huggingface_hub.snapshot_download` and assert repo `mlx-community/whisper-large-v3-mlx`, revision `49e6aa286ad60c14352c404340ded53710378a11`, and an application cache directory are supplied only by an explicit cache-download action. A mismatched `weights.npz` SHA-256 must delete the incomplete cache and raise `TRANSCRIPTION_MODEL_HASH_MISMATCH`. Feed the adapter a scoped MinIO audio object reference; assert Task 11's `MinioObjectMaterializer` verifies version/hash, exposes a private path only inside its async context, and cleans it on success/failure/cancel. Patch only `mlx_whisper.transcribe`; assert its audio argument is that temporary path, `path_or_hf_repo` is the verified local model directory, `language='es'`, `word_timestamps=True`, `task='transcribe'`, and the immutable revision/hash are stored in result metadata. Normal transcription/model use must perform no network call beyond the local MinIO read.

- [ ] **GREEN:** define one adapter-owned immutable model manifest containing the repo, full revision, `weights.npz` hash `05ff791ce3630fae47e7c51004e9666204d786246ec07cac6110af768099b40d`, and expected size. `ModelCache.download()` calls `snapshot_download` with that revision into a private application cache, hashes the completed weight file, and atomically marks the snapshot ready; `ModelCache.require_verified()` never downloads. Implement `MlxWhisperAdapter` with injected Task 11 `MinioObjectMaterializer`; enter its context and run MLX in `asyncio.to_thread`, pass only the verified local model directory to MLX, validate raw output through adapter-only Pydantic Client models, map seconds to integer milliseconds with Decimal `ROUND_HALF_UP`, and emit segment-count progress. Implement `FakeTranscriber` from a checked-in JSON fixture for CI. No application/domain DTO contains `Path`.

- [ ] **REFACTOR:** map contract→Entity and Entity→Record in TS, including backend `MLX_WHISPER`, model, revision, language, object key, duration, word count, runtime, UTC creation. Direct converter tests cover every field and invalid enum.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/domain/test_transcript.py tests/application/test_transcribe_source.py tests/adapters/transcription -q
pnpm exec vitest run apps/web/src/modules/transcription
pnpm test:contracts
pnpm test:architecture
git diff --check
```

Expected: fake path is deterministic, MLX call is local and language-explicit, and PostgreSQL stores metadata/reference rather than word rows.

**Suggested commit:** `feat: add local word-timestamp transcription`
