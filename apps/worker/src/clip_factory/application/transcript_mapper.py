from typing import Any

from clip_factory.domain.transcript import TranscriptDocument


def transcript_to_contract(document: TranscriptDocument) -> dict[str, Any]:
    return {
        "languageTag": document.language_tag,
        "text": document.text,
        "words": [
            {
                "text": w.text,
                "startMs": w.start_ms,
                "endMs": w.end_ms,
                "confidenceMicros": w.confidence_micros,
            }
            for w in document.words
        ],
        "segments": [
            {
                "text": s.text,
                "startMs": s.start_ms,
                "endMs": s.end_ms,
                "wordStartIndex": s.word_start_index,
                "wordEndIndex": s.word_end_index,
            }
            for s in document.segments
        ],
    }
