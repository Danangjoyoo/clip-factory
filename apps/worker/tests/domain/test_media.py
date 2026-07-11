import pytest

from clip_factory.domain.media import MediaProbe, MediaValidationError, validate_probe


def valid_probe(**changes: object) -> MediaProbe:
    values: dict[str, object] = dict(
        duration_ms=1000,
        size_bytes=100,
        container="mp4",
        video_codec="h264",
        width=1,
        height=1,
        frame_rate_numerator=30,
        frame_rate_denominator=1,
        audio_codec="aac",
        sample_rate_hz=16000,
    )
    values.update(changes)
    return MediaProbe(**values)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("probe", "code"),
    [
        (valid_probe(container="avi"), "UNSUPPORTED_CONTAINER"),
        (valid_probe(duration_ms=10_800_001), "SOURCE_TOO_LONG"),
        (valid_probe(size_bytes=10_737_418_241), "SOURCE_TOO_LARGE"),
        (valid_probe(video_codec=""), "VIDEO_STREAM_REQUIRED"),
        (valid_probe(audio_codec=None), "AUDIO_STREAM_REQUIRED"),
    ],
)
def test_source_limit_failures_are_actionable(probe: MediaProbe, code: str) -> None:
    with pytest.raises(MediaValidationError) as error:
        validate_probe(probe)
    assert error.value.code == code


def test_limits_are_inclusive() -> None:
    validate_probe(valid_probe(duration_ms=10_800_000, size_bytes=10_737_418_240))
