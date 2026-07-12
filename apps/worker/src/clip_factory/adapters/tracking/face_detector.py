from collections.abc import Callable, Sequence

from clip_factory.domain.reframe import SubjectObservation
from clip_factory.ports.proxy_frames import ProxyFrame


class FaceDetector:
    """Optional MediaPipe adapter boundary; production decoding stays outside the domain."""

    name = "mediapipe-face-detector"
    revision = "0.10.35"

    def __init__(
        self,
        detector: Callable[[ProxyFrame], Sequence[SubjectObservation]] | None = None,
    ) -> None:
        self._detector = detector

    async def detect(self, frame: ProxyFrame) -> Sequence[SubjectObservation]:
        if self._detector is not None:
            return self._detector(frame)
        if not frame.payload:
            raise RuntimeError("MEDIAPIPE_FRAME_PAYLOAD_REQUIRED")
        try:
            import mediapipe as mp  # type: ignore[import-untyped]
        except ImportError as error:
            raise RuntimeError("MEDIAPIPE_UNAVAILABLE") from error
        # The decoder owns RGB payload construction; this adapter only performs detection.
        if not hasattr(mp, "solutions"):
            raise RuntimeError("MEDIAPIPE_FACE_SOLUTION_UNAVAILABLE")
        raise RuntimeError("MEDIAPIPE_RGB_DECODER_NOT_CONFIGURED")
