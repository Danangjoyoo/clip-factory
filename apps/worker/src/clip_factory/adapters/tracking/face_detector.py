from collections.abc import Sequence

from clip_factory.domain.reframe import SubjectObservation
from clip_factory.ports.proxy_frames import ProxyFrame


class FaceDetector:
    """Optional MediaPipe adapter boundary; production decoding stays outside the domain."""

    name = "mediapipe-face-detector"
    revision = "0.10.35"

    async def detect(self, frame: ProxyFrame) -> Sequence[SubjectObservation]:
        # Deterministic empty result is the safe fallback when native vision is unavailable.
        del frame
        return ()
