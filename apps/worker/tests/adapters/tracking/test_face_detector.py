import asyncio

import pytest

from clip_factory.adapters.tracking.face_detector import FaceDetector
from clip_factory.ports.proxy_frames import ProxyFrame


def test_detector_requires_real_frame_or_injected_capability() -> None:
    with pytest.raises(RuntimeError, match="PAYLOAD_REQUIRED"):
        asyncio.run(FaceDetector().detect(ProxyFrame(0, 640, 360)))


def test_detector_injection_is_deterministic_for_ci() -> None:
    detector = FaceDetector(lambda frame: ())
    assert asyncio.run(detector.detect(ProxyFrame(0, 640, 360))) == ()
