from collections.abc import Sequence

from clip_factory.domain.highlight import TimeRange, TranscriptWindow
from clip_factory.domain.transcript import TranscriptDocument


def build_windows(
    boundaries_ms: Sequence[int],
    duration_ms: int,
    maximum_ms: int = 1_200_000,
    overlap_ms: int = 120_000,
) -> tuple[TimeRange, ...]:
    if duration_ms <= 0 or maximum_ms <= 0 or overlap_ms < 0:
        raise ValueError("invalid window settings")
    boundaries = tuple(
        sorted({max(0, min(duration_ms, value)) for value in boundaries_ms})
    )
    windows: list[TimeRange] = []
    start = 0
    while start < duration_ms:
        eligible_ends = [
            value
            for value in boundaries
            if start < value <= min(duration_ms, start + maximum_ms)
        ]
        end = max(eligible_ends, default=min(duration_ms, start + maximum_ms))
        windows.append(TimeRange(start, end))
        if end == duration_ms:
            break
        eligible_starts = [
            value for value in boundaries if start < value <= end - overlap_ms
        ]
        start = max(eligible_starts, default=end)
    return tuple(windows)


def build_transcript_windows(
    document: TranscriptDocument,
    duration_ms: int | None = None,
    maximum_ms: int = 1_200_000,
    overlap_ms: int = 120_000,
) -> tuple[TranscriptWindow, ...]:
    duration = duration_ms or max(word.end_ms for word in document.words)
    boundaries = [word.end_ms for word in document.words]
    ranges = build_windows(boundaries, duration, maximum_ms, overlap_ms)
    return tuple(
        TranscriptWindow(
            time_range,
            " ".join(
                word.text
                for word in document.words
                if word.start_ms < time_range.end_ms
                and word.end_ms > time_range.start_ms
            ),
        )
        for time_range in ranges
    )
