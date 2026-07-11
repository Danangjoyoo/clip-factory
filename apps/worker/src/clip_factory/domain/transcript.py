"""Validated source-language transcript value objects."""

from dataclasses import dataclass
from typing import Literal, Sequence


@dataclass(frozen=True)
class TranscriptWord:
    text: str
    start_ms: int
    end_ms: int
    confidence_micros: int | None = None


@dataclass(frozen=True)
class TranscriptSegment:
    text: str
    start_ms: int
    end_ms: int
    word_start_index: int
    word_end_index: int


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


class TranscriptValidationError(ValueError):
    def __init__(self, code: str = "INVALID_TRANSCRIPT") -> None:
        self.code = code
        super().__init__(code)


def validate_document(document: TranscriptDocument) -> None:
    if not document.language_tag.strip() or not document.words:
        raise TranscriptValidationError()
    previous = 0
    for word in document.words:
        if (
            not word.text.strip()
            or word.start_ms < 0
            or word.end_ms <= word.start_ms
            or word.start_ms < previous
        ):
            raise TranscriptValidationError()
        if (
            word.confidence_micros is not None
            and not 0 <= word.confidence_micros <= 1_000_000
        ):
            raise TranscriptValidationError()
        previous = word.end_ms
    for segment in document.segments:
        if (
            segment.start_ms < 0
            or segment.end_ms <= segment.start_ms
            or segment.start_ms < 0
            or segment.end_ms > previous
        ):
            raise TranscriptValidationError()
        if (
            not 0
            <= segment.word_start_index
            <= segment.word_end_index
            < len(document.words)
        ):
            raise TranscriptValidationError()
