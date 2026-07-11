import asyncio

from clip_factory.adapters.tracking.proxy_frames import ProxyFrames
from clip_factory.domain.media import MediaProbe


def test_proxy_parameters_are_deterministic() -> None:
    probe = MediaProbe(60_000, 1, "mp4", "h264", 1920, 1080, 30, 1, "aac", 48_000)
    frames = asyncio.run(ProxyFrames().frames("/tmp/source.mp4", probe))
    assert len(frames) == 300
    assert (frames[0].width, frames[0].height) == (640, 360)
    assert frames[-1].time_ms == 59_800
