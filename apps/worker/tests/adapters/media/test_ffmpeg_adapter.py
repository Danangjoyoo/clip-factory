from pathlib import Path
import asyncio
from collections.abc import Sequence

from clip_factory.adapters.media.ffmpeg_adapter import FfmpegAdapter


class RecordingRunner:
    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    async def run(self, argv: Sequence[str | Path], on_stdout_line: object = None) -> tuple[int, str, str]:
        self.calls.append([str(value) for value in argv])
        return 0, "out_time_ms=100\n", ""


def test_extract_speech_uses_normalized_mono_pcm_argv() -> None:
    runner = RecordingRunner()
    asyncio.run(FfmpegAdapter(runner, Path("/tools/ffmpeg")).extract_speech(Path("/safe/input.mov"), Path("/tmp/audio.wav")))
    assert runner.calls == [["/tools/ffmpeg", "-nostdin", "-hide_banner", "-i", "/safe/input.mov", "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-progress", "pipe:1", "-y", "/tmp/audio.wav"]]
