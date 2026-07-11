import json
from fractions import Fraction
from pathlib import Path

from clip_factory.domain.media import MediaProbe
from clip_factory.ports.process_runner import ProcessRunner


class FfprobeError(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class FfprobeAdapter:
    def __init__(self, runner: ProcessRunner, executable: str | Path = "ffprobe") -> None:
        self._runner = runner
        self._executable = str(executable)

    async def probe(self, source: Path) -> MediaProbe:
        code, stdout, _ = await self._runner.run(
            [self._executable, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", source]
        )
        if code != 0:
            raise FfprobeError("FFPROBE_FAILED")
        try:
            payload = json.loads(stdout)
            streams = payload["streams"]
            fmt = payload["format"]
            video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
            if video is None:
                raise FfprobeError("VIDEO_STREAM_REQUIRED")
            audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
            duration_ms = round(float(fmt["duration"]) * 1000)
            fps = Fraction(video.get("r_frame_rate", "0/1"))
            container = str(fmt.get("format_name", "").split(",")[0])
            return MediaProbe(
                duration_ms=duration_ms,
                size_bytes=int(fmt.get("size", 0)),
                container=container,
                video_codec=str(video.get("codec_name", "")),
                width=int(video.get("width", 0)),
                height=int(video.get("height", 0)),
                frame_rate_numerator=fps.numerator,
                frame_rate_denominator=fps.denominator,
                audio_codec=None if audio is None else str(audio.get("codec_name", "")),
                sample_rate_hz=None if audio is None else int(audio.get("sample_rate", 0)),
            )
        except (KeyError, TypeError, ValueError, StopIteration, ZeroDivisionError) as error:
            raise FfprobeError("FFPROBE_INVALID_JSON") from error
