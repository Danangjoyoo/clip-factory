from collections.abc import Sequence

from clip_factory.domain.media import MediaProbe
from clip_factory.ports.process_runner import ProcessRunner
from clip_factory.ports.proxy_frames import ProxyFrame


class ProxyFrames:
    """Builds deterministic proxy parameters without mutating the source asset."""

    def __init__(self, runner: ProcessRunner | None = None) -> None:
        self._runner = runner

    async def frames(self, source: str, probe: MediaProbe, sample_rate_hz: int = 5, width: int = 640) -> Sequence[ProxyFrame]:
        if sample_rate_hz <= 0 or width <= 0:
            raise ValueError("invalid proxy parameters")
        height = max(1, round(probe.height * width / probe.width))
        count = max(0, round(probe.duration_ms / 1000 * sample_rate_hz))
        if self._runner is not None:
            argv = ("ffmpeg", "-nostdin", "-hide_banner", "-i", source, "-vf", f"fps={sample_rate_hz},scale={width}:{height}", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1")
            code, _, stderr = await self._runner.run(argv)
            if code != 0:
                raise RuntimeError(f"PROXY_FFMPEG_FAILED: {stderr}")
        return tuple(ProxyFrame(round(index * 1000 / sample_rate_hz), width, height) for index in range(count))
