from __future__ import annotations

from pathlib import Path
from typing import Any

from clip_factory.adapters.media.encoder_probe import EncoderProbe
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.process_runner import ProcessRunner


class FfmpegRenderError(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class FfmpegRenderEngine:
    def __init__(self, runner: ProcessRunner, executable: str | Path = "ffmpeg") -> None:
        self._runner = runner
        self._executable = str(executable)

    async def render(
        self, spec: RenderSpec, source: Path, captions: Path, destination: Path
    ) -> dict[str, str]:
        strategy = str(spec.encoder.get("strategy", "SOFTWARE"))
        args = [
            self._executable,
            "-nostdin",
            "-hide_banner",
            "-y",
            "-ss",
            f"{spec.range_ms[0] / 1000:.3f}",
            "-t",
            f"{(spec.range_ms[1] - spec.range_ms[0]) / 1000:.3f}",
            "-i",
            source,
            "-vf",
            f"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles={captions}",
            "-map",
            "0:v:0",
            "-map",
            "0:a:0",
            *EncoderProbe.encoder_args(strategy),
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            "-f",
            "mp4",
            destination,
        ]
        code, _, _ = await self._runner.run(args)
        if code != 0:
            raise FfmpegRenderError("FFMPEG_RENDER_FAILED")
        return {"strategy": strategy, "videoCodec": "h264", "audioCodec": "aac"}
