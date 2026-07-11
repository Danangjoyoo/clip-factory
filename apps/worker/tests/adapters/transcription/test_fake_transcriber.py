import asyncio
from clip_factory.adapters.transcription.fake_transcriber import FakeTranscriber


def test_fake_transcriber_preserves_language_and_document():
    t = FakeTranscriber()
    result = asyncio.run(t.transcribe(object(), "es", None))
    assert result.backend == "FAKE" and result.document.words
    assert t.calls[0].language_tag == "es"
