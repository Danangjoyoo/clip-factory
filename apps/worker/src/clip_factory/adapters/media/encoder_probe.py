from __future__ import annotations

from pathlib import Path
from typing import Protocol

from clip_factory.ports.process_runner import ProcessRunner


class EncoderProbe:
    def __init__(self, runner: ProcessRunner, executable: str | Path = "ffmpeg") -> None:
        self._runner = runner
        self._executable = str(executable)

    async def select(self, prefer_videotoolbox: bool = True) -> str:
        code, stdout, _ = await self._runner.run([self._executable, "-hide_banner", "-encoders"])
        encoders = stdout if code == 0 else ""
        if prefer_videotoolbox and "h264_videotoolbox" in encoders:
            probe_code, _, _ = await self._runner.run(
                [self._executable, "-f", "lavfi", "-i", "color=s=16x16:d=1", "-c:v", "h264_videotoolbox", "-f", "null", "-"]
            )
            if probe_code == 0:
                return "VIDEOTOOLBOX"
        return "SOFTWARE"

    @staticmethod
    def encoder_args(strategy: str) -> list[str]:
        if strategy == "VIDEOTOOLBOX":
            return ["-c:v", "h264_videotoolbox", "-q:v", "65", "-allow_sw", "0"]
        return ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p"]
