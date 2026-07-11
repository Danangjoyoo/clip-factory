from dataclasses import dataclass

from clip_factory.domain.reframe import CropPoint, SubjectObservation, build_crop_track
from clip_factory.ports.proxy_frames import ProxyFramePort
from clip_factory.ports.subject_detector import SubjectDetectorPort


@dataclass(frozen=True)
class ReframeResult:
    points: tuple[CropPoint, ...]
    algorithm_version: str
    probe: object


class BuildCropTrack:
    def __init__(self, proxy_frames: ProxyFramePort, detector: SubjectDetectorPort) -> None:
        self._proxy_frames = proxy_frames
        self._detector = detector

    async def execute(self, source: str, probe: object) -> ReframeResult:
        frames = await self._proxy_frames.frames(source, probe)  # type: ignore[arg-type]
        selected: list[SubjectObservation] = []
        for frame in frames:
            candidates = tuple(await self._detector.detect(frame))
            if candidates:
                selected.append(max(candidates, key=lambda item: 6 * item.speaking_micros + 3 * item.area_micros + item.center_proximity_micros))
            else:
                selected.append(SubjectObservation(frame.time_ms, 500_000, 500_000, 0))
        return ReframeResult(build_crop_track(tuple(selected)), "reframe-v1", probe)
