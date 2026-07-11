from typing import Protocol
from clip_factory.domain.transcript import Transcription
from clip_factory.ports.source_preprocessor import ObjectReference, ProgressCallback


class TranscriberPort(Protocol):
    async def transcribe(
        self,
        audio_object: ObjectReference,
        language_tag: str,
        progress: ProgressCallback,
    ) -> Transcription: ...
