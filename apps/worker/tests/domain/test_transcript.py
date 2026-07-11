import pytest
from clip_factory.domain.transcript import TranscriptDocument, TranscriptWord, TranscriptSegment, TranscriptValidationError, validate_document

def valid():
    return TranscriptDocument('es', 'hola', (TranscriptWord('hola', 0, 100, None),), (TranscriptSegment('hola', 0, 100, 0, 0),))

def test_validates_language_timestamps_and_nullable_confidence():
    validate_document(valid())

@pytest.mark.parametrize('doc', [TranscriptDocument('', 'x', (), ()), TranscriptDocument('en', 'x', (TranscriptWord('x', 2, 1),), ())])
def test_rejects_invalid_transcripts(doc):
    with pytest.raises(TranscriptValidationError):
        validate_document(doc)
