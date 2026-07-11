import inspect
from collections.abc import Awaitable, Callable
from pathlib import Path

from clip_factory.adapters.media.ffmpeg_render_spec_compiler import FfmpegRenderSpecCompiler
from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.process_runner import ProcessRunner
from clip_factory.ports.render_spec_compiler import RenderSpecCompiler


class FfmpegPreviewError(RuntimeError):
    pass


class FfmpegPreviewRenderer:
    def __init__(
        self,
        runner: ProcessRunner,
        compiler: RenderSpecCompiler | None = None,
        executable: str | Path = "ffmpeg",
    ) -> None:
        self._runner = runner
        self._compiler = compiler or FfmpegRenderSpecCompiler()
        self._executable = str(executable)

    async def render(self, spec: RenderSpec, destination: Path, width: int = 360, height: int = 640, progress: Callable[[int], Awaitable[None] | None] | None = None) -> MediaProbe:
        compiled = self._compiler.compile(spec, "preview")
        source = _source_path(spec)
        argv = [self._executable, "-nostdin", "-hide_banner", "-ss", _seconds(spec.range_ms[0]), "-to", _seconds(spec.range_ms[1]), "-i", source, "-vf", ",".join(compiled.filter_args), *compiled.encoder_args, "-progress", "pipe:1", "-y", destination]

        async def on_line(line: str) -> None:
            if progress and line.startswith("out_time_ms="):
                try:
                    result = progress(int(line.partition("=")[2]))
                    if inspect.isawaitable(result):
                        await result
                except ValueError:
                    pass

        code, _, stderr = await self._runner.run(argv, on_line)
        if code:
            raise FfmpegPreviewError(stderr or "FFMPEG_FAILED")
        return MediaProbe(0, destination.stat().st_size if destination.exists() else 0, "mp4", "h264", width, height, 30, 1, "aac", 48_000)

    async def thumbnail(self, preview: Path, destination: Path, time_ms: int = 0) -> None:
        code, _, stderr = await self._runner.run([self._executable, "-nostdin", "-hide_banner", "-ss", _seconds(time_ms), "-i", preview, "-frames:v", "1", "-q:v", "2", "-y", destination])
        if code:
            raise FfmpegPreviewError(stderr or "FFMPEG_FAILED")


def _seconds(milliseconds: int) -> str:
    return f"{milliseconds / 1000:.3f}"


def _source_path(spec: RenderSpec) -> str:
    source = spec.source
    value = source.get("path", source.get("locator"))
    if value is None:
        raise FfmpegPreviewError("SOURCE_PATH_REQUIRED")
    return str(value)
