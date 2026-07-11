from pathlib import Path

from clip_factory.adapters.media.ffmpeg_adapter import FfmpegError
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.preview_renderer import PreviewMedia
from clip_factory.ports.process_runner import ProcessRunner
from clip_factory.ports.render_spec_compiler import RenderProfile, RenderSpecCompiler


class FfmpegPreviewRenderer:
    def __init__(
        self,
        runner: ProcessRunner,
        compiler: RenderSpecCompiler,
        executable: str | Path = "ffmpeg",
        source: str | Path = "source",
    ) -> None:
        self._runner, self._compiler, self._executable, self._source = (
            runner,
            compiler,
            str(executable),
            str(source),
        )

    async def render(
        self, spec: RenderSpec, destination: Path, width: int = 360, height: int = 640
    ) -> PreviewMedia:
        compiled = self._compiler.compile(spec, RenderProfile.PREVIEW)
        argv = [
            self._executable,
            "-nostdin",
            "-hide_banner",
            "-ss",
            str(spec.range_ms[0] / 1000),
            "-to",
            str(spec.range_ms[1] / 1000),
            "-i",
            self._source,
            "-vf",
            compiled.filters[0].replace("scale=360:640", f"scale={width}:{height}"),
            *compiled.encoders,
            "-progress",
            "pipe:1",
            "-y",
            destination,
        ]
        duration = 0

        async def progress(line: str) -> None:
            nonlocal duration
            if line.startswith("out_time_ms="):
                try:
                    duration = int(line.partition("=")[2])
                except ValueError:
                    pass

        code, _, _ = await self._runner.run(argv, progress)
        if code:
            raise FfmpegError("FFMPEG_FAILED")
        return PreviewMedia(destination, duration_ms=duration)

    async def thumbnail(
        self, preview: Path, destination: Path, time_ms: int = 0
    ) -> Path:
        argv = [
            self._executable,
            "-nostdin",
            "-hide_banner",
            "-ss",
            str(time_ms / 1000),
            "-i",
            preview,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            "-y",
            destination,
        ]
        code, _, _ = await self._runner.run(argv)
        if code:
            raise FfmpegError("FFMPEG_FAILED")
        return destination
