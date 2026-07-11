from clip_factory.application.build_transcript_windows import build_windows
from clip_factory.domain.highlight import TimeRange


def test_windows_follow_boundaries_and_overlap() -> None:
    assert build_windows([0, 400_000, 800_000, 1_200_000, 1_600_000], 1_600_000) == (
        TimeRange(0, 1_200_000), TimeRange(800_000, 1_600_000)
    )
