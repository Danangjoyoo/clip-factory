from uuid import uuid4
import asyncio
from clip_factory.application.transcribe_source import (
    TranscribeCommand,
    TranscribeSource,
)
from clip_factory.adapters.transcription.fake_transcriber import FakeTranscriber
from clip_factory.adapters.storage.minio_artifact_store import MinioArtifactStore
from clip_factory.ports.source_preprocessor import ObjectReference


class Clock:
    def __init__(self):
        self.now = 10

    def monotonic_ms(self):
        self.now += 5
        return self.now


def test_mapper_persists_contract_with_indexes(tmp_path):
    store = MinioArtifactStore(tmp_path)
    service = TranscribeSource(FakeTranscriber(), store, Clock())
    project = uuid4()
    result = asyncio.run(
        service.execute(
            TranscribeCommand(project, ObjectReference("b", "k", "v", "0" * 64), "es")
        )
    )
    raw = (tmp_path / "clip-factory" / result.object_reference.key).read_text()
    assert "wordStartIndex" in raw and "confidenceMicros" in raw
