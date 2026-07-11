"""Media probe value objects and source policy."""

from dataclasses import dataclass

ALLOWED_CONTAINERS = frozenset({"mp4", "mov", "matroska", "webm"})
MAX_DURATION_MS = 3 * 60 * 60 * 1000
MAX_SIZE_BYTES = 10 * 1024 * 1024 * 1024


class MediaValidationError(Exception):
    def __init__(self, code: str, message: str | None = None) -> None:
        self.code = code
        super().__init__(message or code)


@dataclass(frozen=True)
class MediaProbe:
    duration_ms: int
    size_bytes: int
    container: str
    video_codec: str
    width: int
    height: int
    frame_rate_numerator: int
    frame_rate_denominator: int
    audio_codec: str | None
    sample_rate_hz: int | None


def validate_probe(probe: MediaProbe) -> None:
    if probe.container not in ALLOWED_CONTAINERS:
        raise MediaValidationError("UNSUPPORTED_CONTAINER")
    if probe.duration_ms <= 0 or probe.duration_ms > MAX_DURATION_MS:
        raise MediaValidationError("SOURCE_TOO_LONG")
    if probe.size_bytes <= 0 or probe.size_bytes > MAX_SIZE_BYTES:
        raise MediaValidationError("SOURCE_TOO_LARGE")
    if not probe.video_codec:
        raise MediaValidationError("VIDEO_STREAM_REQUIRED")
    if not probe.audio_codec:
        raise MediaValidationError("AUDIO_STREAM_REQUIRED")
