import asyncio

from clip_factory.application.build_crop_track import BuildCropTrack
from clip_factory.domain.media import MediaProbe
from clip_factory.domain.reframe import SubjectObservation


class Proxy:
    async def frames(self, source, probe):
        del source, probe
        return [type("Frame", (), {"time_ms": 0})()]


class Detector:
    async def detect(self, frame):
        del frame
        return [SubjectObservation(0, 100_000, 500_000, 900_000, speaking_micros=100_000, area_micros=900_000), SubjectObservation(0, 800_000, 500_000, 900_000, speaking_micros=900_000, area_micros=100_000)]


def test_selects_dominant_subject_and_records_algorithm() -> None:
    probe = MediaProbe(1_000, 1, "mp4", "h264", 1920, 1080, 30, 1, "aac", 48_000)
    result = asyncio.run(BuildCropTrack(Proxy(), Detector()).execute("source", probe))
    assert result.algorithm_version == "reframe-v1"
    assert result.points[0].center_x_micros == 800_000
