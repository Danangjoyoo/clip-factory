from collections.abc import Awaitable, Callable
import inspect
from pathlib import Path

from clip_factory.ports.process_runner import ProcessRunner


class FfmpegError(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class FfmpegAdapter:
    def __init__(self, runner: ProcessRunner, executable: str | Path = "ffmpeg") -> None:
        self._runner = runner
        self._executable = str(executable)

    async def extract_speech(
        self,
        source: Path,
        destination: Path,
        progress: Callable[[int], Awaitable[None] | None] | None = None,
    ) -> None:
        async def on_line(line: str) -> None:
            if progress and line.startswith("out_time_ms="):
                try:
                    value = int(line.partition("=")[2])
                except ValueError:
                    return
                result = progress(value)
                if inspect.isawaitable(result):
                    await result

        code, _, _ = await self._runner.run(
            [self._executable, "-nostdin", "-hide_banner", "-i", source, "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-progress", "pipe:1", "-y", destination],
            on_line,
        )
        if code != 0:
            raise FfmpegError("FFMPEG_FAILED")
