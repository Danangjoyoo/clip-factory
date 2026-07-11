from dataclasses import dataclass, field
from uuid import UUID, uuid4
from clip_factory.domain.transcript import validate_document
from clip_factory.ports.transcriber import TranscriberPort
from clip_factory.ports.artifact_store import ArtifactStorePort
from clip_factory.ports.clock import ClockPort
from clip_factory.ports.source_preprocessor import ObjectReference, ProgressCallback
from clip_factory.application.transcript_mapper import transcript_to_contract


@dataclass(frozen=True)
class TranscribeCommand:
    project_id: UUID
    audio_object: ObjectReference
    language_tag: str
    transcript_id: UUID = field(default_factory=uuid4)
    progress: ProgressCallback = field(default=lambda *_: None)


@dataclass(frozen=True)
class TranscriptResult:
    transcript_id: UUID
    object_reference: ObjectReference
    word_count: int
    duration_ms: int
    runtime_ms: int
    backend: str
    model: str
    model_revision: str
    weights_sha256: str | None


class TranscribeSource:
    def __init__(
        self, transcriber: TranscriberPort, store: ArtifactStorePort, clock: ClockPort
    ) -> None:
        self._transcriber, self._store, self._clock = transcriber, store, clock

    async def execute(self, command: TranscribeCommand) -> TranscriptResult:
        started = self._clock.monotonic_ms()
        transcription = await self._transcriber.transcribe(
            command.audio_object, command.language_tag, command.progress
        )
        document = transcription.document
        validate_document(document)
        transcript_id = (
            command.transcript_id
            if isinstance(command.transcript_id, UUID)
            else uuid4()
        )
        key = f"projects/{command.project_id}/transcripts/{transcript_id}.v1.json"
        payload = transcript_to_contract(document)
        reference = await self._store.put_json(key, payload)
        return TranscriptResult(
            transcript_id,
            reference,
            len(document.words),
            document.words[-1].end_ms,
            self._clock.monotonic_ms() - started,
            transcription.backend,
            transcription.model,
            transcription.model_revision,
            transcription.weights_sha256,
        )
