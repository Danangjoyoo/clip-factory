from pathlib import Path
from clip_factory.ports.process_runner import ProcessRunner


class FfmpegRenderEngine:
    def __init__(self, runner: ProcessRunner, executable: str = "ffmpeg") -> None:
        self._runner, self._executable = runner, executable

    async def render(
        self, source: Path, output: Path, captions: Path, strategy: str = "SOFTWARE"
    ) -> None:
        video = "h264_videotoolbox" if strategy == "VIDEOTOOLBOX" else "libx264"
        argv: list[str | Path] = [
            self._executable,
            "-nostdin",
            "-y",
            "-i",
            source,
            "-i",
            captions,
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            "-vf",
            f"ass={captions}",
            "-c:v",
            video,
        ]
        argv += (
            ["-preset", "slow", "-crf", "18"]
            if strategy != "VIDEOTOOLBOX"
            else ["-q:v", "65", "-allow_sw", "0"]
        )
        argv += [
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            output,
        ]
        code, _, _ = await self._runner.run(argv)
        if code != 0:
            raise RuntimeError("RENDER_FAILED")
