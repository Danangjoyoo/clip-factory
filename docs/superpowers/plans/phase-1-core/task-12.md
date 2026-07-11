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
- Create: `apps/web/src/modules/transcription/adapters/persistence/converters/transcript.converter.ts`
- Create: `apps/web/src/modules/transcription/delivery/http/dto/api/transcript-result-api.dto.ts`
- Create: `apps/web/src/modules/transcription/converters/api-entity/transcript-result.converter.ts`
- Test: `apps/web/src/modules/transcription/application/data-services/transcript.data-service.test.ts`
- Test: `apps/web/src/modules/transcription/adapters/persistence/converters/transcript.converter.test.ts`
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

@dataclass(frozen=True)
class Transcription:
    document: TranscriptDocument
    backend: Literal["MLX_WHISPER", "FAKE"]
    model: str
    model_revision: str
    weights_sha256: str | None

class TranscriberPort(Protocol):
    async def transcribe(self, audio_object: ObjectReference, language_tag: str, progress: ProgressCallback) -> Transcription:
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
    assert result.object_reference.key == f"projects/{PROJECT_ID}/transcripts/{result.transcript_id}.v1.json"
    assert result.object_reference.bucket == "clip-factory"
    assert result.object_reference.version_id == "v1"
    assert len(result.object_reference.sha256) == 64
    assert result.word_count == 3
    assert result.backend == "FAKE"
    assert result.model_revision == "fixture-v1"
    assert result.weights_sha256 is None
    assert store.json_objects[result.object_reference.key]["words"][1] == {"text": "mundo", "startMs": 510, "endMs": 900, "confidenceMicros": 970000}
    assert "hello" not in store.json_objects[result.object_reference.key]["text"]
```

- [ ] Create compile-safe transcription ports/dataclasses and a `TranscribeSource.execute` shell returning an empty transcript, verify collection passes, then run the test; expect the named word-timestamp assertion to FAIL with an empty word list.

- [ ] **GREEN: create the use case.**

```python
class TranscribeSource:
    def __init__(self, transcriber: TranscriberPort, store: ArtifactStorePort, clock: ClockPort) -> None:
        self._transcriber = transcriber
        self._store = store
        self._clock = clock

    async def execute(self, command: TranscribeCommand) -> TranscriptResult:
        started = self._clock.monotonic_ms()
        transcription = await self._transcriber.transcribe(command.audio_object, command.language_tag, command.progress)
        document = transcription.document
        validate_document(document)
        transcript_id = command.transcript_id
        key = f"projects/{command.project_id}/transcripts/{transcript_id}.v1.json"
        reference = await self._store.put_json(key, transcript_to_contract(document))
        return TranscriptResult(transcript_id=transcript_id, object_reference=reference, word_count=len(document.words), duration_ms=document.words[-1].end_ms, runtime_ms=self._clock.monotonic_ms() - started, backend=transcription.backend, model=transcription.model, model_revision=transcription.model_revision, weights_sha256=transcription.weights_sha256)
```

- [ ] Run `uv run --directory apps/worker pytest tests/application/test_transcribe_source.py -q`; expect PASS.

- [ ] **RED: table-test invalid output:** overlapping/decreasing timestamps, negative times, `end <= start`, segment outside duration, blank language, confidence outside `0..1000000`, and empty document each raise `INVALID_TRANSCRIPT`.

- [ ] **GREEN:** implement `validate_document(document: TranscriptDocument) -> None` in `domain/transcript.py` as one linear ordered-word/segment scan enforcing the named bounds while allowing adjacent equal boundaries; add no translation or language-detection branch. Run `uv run --directory apps/worker pytest tests/domain/test_transcript.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_transcript.py tests/application/test_transcribe_source.py tests/adapters/transcription -q
# Expected: PASS
```

- [ ] Run `uv run --directory apps/worker pytest tests/domain/test_transcript.py -q`; expect PASS.

- [ ] **RED: model-cache, audio materialization, and exact MLX-call tests.** Stub `huggingface_hub.snapshot_download` and assert repo `mlx-community/whisper-large-v3-mlx`, revision `49e6aa286ad60c14352c404340ded53710378a11`, and an application cache directory are supplied only by an explicit cache-download action. A mismatched `weights.npz` SHA-256 must delete the incomplete cache and raise `TRANSCRIPTION_MODEL_HASH_MISMATCH`. Feed the adapter a scoped MinIO audio object reference; assert Task 11's `MinioObjectMaterializer` verifies version/hash, exposes a private path only inside its async context, and cleans it on success/failure/cancel. Patch only `mlx_whisper.transcribe`; assert its audio argument is that temporary path, `path_or_hf_repo` is the verified local model directory, `language='es'`, `word_timestamps=True`, `task='transcribe'`, and the immutable revision/hash are stored in result metadata. Normal transcription/model use must perform no network call beyond the local MinIO read.

- [ ] **GREEN:** in `model_manifest.py` define the immutable repo/revision/hash/size record; implement `ModelCache.download` and `require_verified` in `model_cache.py`; implement `MlxWhisperAdapter.transcribe` in `mlx_whisper_adapter.py` with Task 11 `MinioObjectMaterializer`, `asyncio.to_thread`, adapter-only Pydantic Client models, Decimal `ROUND_HALF_UP` milliseconds, and segment-count progress; implement `FakeTranscriber.transcribe` from `tests/fixtures/transcription/fake-transcript.json`. No application/domain DTO contains `Path`. Run `uv run --directory apps/worker pytest tests/adapters/transcription/test_model_cache.py tests/adapters/transcription/test_mlx_whisper_adapter.py tests/adapters/transcription/test_fake_transcriber.py -q`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_transcript.py tests/application/test_transcribe_source.py tests/adapters/transcription -q
# Expected: PASS
```

- [ ] **REFACTOR:** map contract→Entity at delivery and Entity→Record privately inside `PrismaTranscriptRepository`, including backend `MLX_WHISPER`, model, full immutable model revision, nullable weights SHA-256, language, and the complete artifact `{bucket,key,versionId,sha256}` plus duration, word count, runtime, and UTC creation. The repository writes `objectBucket`, `objectKey`, `objectVersionId`, and `objectSha256` atomically; its round-trip test proves none is lost. The internal callback rejects incomplete object references, rejects MLX results whose model revision/hash differ from the Task 12 manifest, and requires null model-weights hash only for `FAKE`. Re-run `uv run --directory apps/worker pytest tests/domain/test_transcript.py tests/application/test_transcribe_source.py tests/adapters/transcription -q && pnpm exec vitest run apps/web/src/modules/transcription && pnpm test:architecture`; expect PASS.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/domain/test_transcript.py tests/application/test_transcribe_source.py tests/adapters/transcription -q
# Expected: PASS
```

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
