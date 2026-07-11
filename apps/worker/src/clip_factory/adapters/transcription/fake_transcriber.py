from clip_factory.domain.transcript import (
    Transcription,
    TranscriptDocument,
    TranscriptSegment,
    TranscriptWord,
)


class FakeTranscriber:
    def __init__(self, document: TranscriptDocument | None = None) -> None:
        self.document = document or TranscriptDocument(
            "en",
            "hello world",
            (
                TranscriptWord("hello", 0, 500, 900000),
                TranscriptWord("world", 500, 900, 900000),
            ),
            (TranscriptSegment("hello world", 0, 900, 0, 1),),
        )
        self.calls: list[object] = []

    async def transcribe(
        self, audio_object: object, language_tag: str, progress: object
    ) -> Transcription:
        self.calls.append(
            type(
                "Call", (), {"audio_object": audio_object, "language_tag": language_tag}
            )()
        )
        return Transcription(self.document, "FAKE", "fixture", "fixture-v1", None)
