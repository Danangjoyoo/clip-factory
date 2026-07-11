import asyncio

from clip_factory.adapters.tracking.proxy_frames import ProxyFrames
from clip_factory.domain.media import MediaProbe


def test_proxy_parameters_are_deterministic() -> None:
    probe = MediaProbe(60_000, 1, "mp4", "h264", 1920, 1080, 30, 1, "aac", 48_000)
    frames = asyncio.run(ProxyFrames().frames("/tmp/source.mp4", probe))
    assert len(frames) == 300
    assert (frames[0].width, frames[0].height) == (640, 360)
    assert frames[-1].time_ms == 59_800


def test_proxy_runner_receives_non_mutating_ffmpeg_pipeline() -> None:
    class Runner:
        def __init__(self):
            self.argv = None

        async def run(self, argv, on_stdout_line=None):
            del on_stdout_line
            self.argv = tuple(argv)
            return (0, "", "")

    runner = Runner()
    probe = MediaProbe(1_000, 1, "mp4", "h264", 1920, 1080, 30, 1, "aac", 48_000)
    asyncio.run(ProxyFrames(runner).frames("/tmp/source.mp4", probe))
    assert runner.argv is not None
    assert "-f" in runner.argv and "rawvideo" in runner.argv
    assert "/tmp/source.mp4" in runner.argv
